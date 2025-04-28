/// Module: shroud
module shroud::core;

use shroud::coin_diff;
use shroud::fr;
use shroud::merkle::{Self, MerkleTree};
use std::type_name::{TypeName, get};
use sui::bag::{Self, Bag};
use sui::bcs::to_bytes;
use sui::coin::{Self, Coin};
use sui::event::emit;
use sui::groth16;
use sui::object_bag::{Self, ObjectBag};
use sui::table::{Self, Table};

const ETREE_NOT_EMPTY: u64 = 0x1;
const ETOKEN_NOT_ALLOWED: u64 = 0x2;
const EOLD_NULLIFIER_EXISTS: u64 = 0x3;
const EINVALID_ROOT: u64 = 0x4;
const EINSUFFICIENT_RECEIVED: u64 = 0x5;
const ETOKEN_ALREADY_ALLOWED: u64 = 0x6;
const EINVALID_PROOF: u64 = 0x7;

public struct Shroud has key, store {
    id: UID,
    tree: MerkleTree,
    nullifiers: Table<u256, bool>,
    balances: ObjectBag,
    allowed_token_length: u64,
    allowed_tokens: vector<TypeName>,
    keys: Bag,
}

public struct ShroudAdmin has key {
    id: UID,
}

// --- EVENTS ---

public struct Deposited<phantom T> has copy, drop {
    account: address,
    amount: u64,
}

public struct Withdrawn<phantom T> has copy, drop {
    account: address,
    amount: u64,
}

public struct Swapped<phantom ORIGIN, phantom TARGET> has copy, drop {
    origin_amount: u64,
    target_amount: u64,
}

public struct NullifierUsed has copy, drop {
    nullifier: u256,
}

public struct LeafInserted has copy, drop {
    index: u64,
    value: u256,
    new_root: u256,
}

// --- Helper Functions ---

fun get_vk(shroud: &Shroud): groth16::PreparedVerifyingKey {
    let vk_bytes: &vector<u8> = shroud.keys.borrow(0);
    let pvk = groth16::prepare_verifying_key(&groth16::bn254(), vk_bytes);
    pvk
}

fun set_vk(shroud: &mut Shroud, vk_bytes: vector<u8>) {
    if (shroud.keys.length() == 0) {
        shroud.keys.add(0, vk_bytes);
    } else {
        let bytes: &mut vector<u8> = shroud.keys.borrow_mut(0);
        *bytes = vk_bytes;
    }
}

fun verify_proof(
    shroud: &Shroud,
    current_root: u256,
    diff_hash: u256,
    old_leaf_nullifier: u256,
    new_leaf: u256,
    proof: vector<u8>,
    address: u256,
    aux: u256,
) {
    let vk = get_vk(shroud);
    let proof_points = groth16::proof_points_from_bytes(proof);
    let mut public_inputs_bytes: vector<u8> = vector::empty();
    // 1: merkle root
    public_inputs_bytes.append(to_bytes(&current_root));
    // 2: diff hash
    public_inputs_bytes.append(to_bytes(&diff_hash));
    // 3: old leaf nullifier
    public_inputs_bytes.append(to_bytes(&old_leaf_nullifier));
    // 4: new leaf
    public_inputs_bytes.append(to_bytes(&new_leaf));
    // 5: public address
    public_inputs_bytes.append(to_bytes(&address));
    // 6: aux
    public_inputs_bytes.append(to_bytes(&aux));
    let public_inputs = groth16::public_proof_inputs_from_bytes(public_inputs_bytes);
    let is_valid = groth16::verify_groth16_proof(
        &groth16::bn254(),
        &vk,
        &public_inputs,
        &proof_points,
    );
    assert!(is_valid, EINVALID_PROOF);
}

fun init(ctx: &mut TxContext) {
    let level = 20;
    let valid_size = 20;
    let default_leaf = 0;
    let allowed_token_length = 5;
    let shroud = Shroud {
        id: object::new(ctx),
        tree: merkle::new(level, valid_size, default_leaf, ctx),
        allowed_token_length: allowed_token_length,
        nullifiers: table::new(ctx),
        balances: object_bag::new(ctx),
        allowed_tokens: vector::empty(),
        keys: bag::new(ctx),
    };
    transfer::share_object(shroud);
    transfer::transfer(ShroudAdmin { id: object::new(ctx) }, ctx.sender());
}

// --- FUNCTIONS ---

public fun initialize_prover(_: &mut ShroudAdmin, shroud: &mut Shroud, vk_bytes: vector<u8>) {
    set_vk(shroud, vk_bytes);
}

public fun allow_token<T>(_: &mut ShroudAdmin, shroud: &mut Shroud, ctx: &mut TxContext) {
    assert!(shroud.tree.size() == 0, ETREE_NOT_EMPTY);
    assert!(!shroud.allowed_tokens.contains(&get<T>()), ETOKEN_ALREADY_ALLOWED);

    let tn = get<T>();
    shroud.allowed_tokens.push_back(tn);
    shroud.balances.add(tn, coin::zero<T>(ctx));
}

public fun deposit<T>(
    shroud: &mut Shroud,
    coin: Coin<T>,
    current_root: u256,
    old_leaf_nullifier: u256,
    new_leaf: u256,
    proof: vector<u8>,
    ctx: &mut TxContext,
) {
    let tn = get<T>();
    assert!(shroud.allowed_tokens.contains(&tn), ETOKEN_NOT_ALLOWED);

    let amount = coin.value();
    let prev_coin: &mut Coin<T> = shroud.balances.borrow_mut(tn);
    prev_coin.join(coin);

    let mut coin_diff = coin_diff::empty(shroud.allowed_token_length, shroud.allowed_tokens);
    coin_diff.add_coin(tn, amount);
    let diff_hash = coin_diff.final_repr();

    // verify proof
    // 1. old leaf is in tree root (current_root)
    // 2. old leaf nullifier is correct
    // 3. new leaf is calculated correctly by adding correct coin
    //    value with correct coin type to the old leaf
    // public address
    verify_proof(
        shroud,
        current_root,
        diff_hash,
        old_leaf_nullifier,
        new_leaf,
        proof,
        fr::from_address_bytes(ctx.sender()).repr(),
        0,
    );

    // check if root valid
    assert!(shroud.tree.is_valid_root(current_root), EINVALID_ROOT);

    // check if old nullifier exists
    if (old_leaf_nullifier != 0) {
        assert!(!shroud.nullifiers.contains(old_leaf_nullifier), EOLD_NULLIFIER_EXISTS);
        // add old nullifier to nullifiers table
        shroud.nullifiers.add(old_leaf_nullifier, true);
        emit(NullifierUsed {
            nullifier: old_leaf_nullifier,
        });
    };

    let (index, root) = shroud.tree.insert(new_leaf);

    emit(Deposited<T> {
        account: ctx.sender(),
        amount: amount,
    });

    emit(LeafInserted {
        index: index,
        value: new_leaf,
        new_root: root,
    });
}

public fun withdraw<T>(
    shroud: &mut Shroud,
    amount: u64,
    current_root: u256,
    old_leaf_nullifier: u256,
    new_leaf: u256,
    proof: vector<u8>,
    ctx: &mut TxContext,
): Coin<T> {
    let tn = get<T>();
    assert!(shroud.allowed_tokens.contains(&tn), ETOKEN_NOT_ALLOWED);

    let prev_coin: &mut Coin<T> = shroud.balances.borrow_mut(tn);
    let withdrawn_coin = prev_coin.split(amount, ctx);

    let mut coin_diff = coin_diff::empty(shroud.allowed_token_length, shroud.allowed_tokens);
    coin_diff.sub_coin(tn, amount);
    let diff_hash = coin_diff.final_repr();

    // verify proof
    // 1. old leaf is in tree root (current_root)
    // 2. old leaf nullifier is correct
    // 3. new leaf is calculated correctly by subtracting correct coin
    //    value with correct coin type to the old leaf and final amount >= 0
    // public address
    verify_proof(
        shroud,
        current_root,
        diff_hash,
        old_leaf_nullifier,
        new_leaf,
        proof,
        fr::from_address_bytes(ctx.sender()).repr(),
        0,
    );

    // check if root valid
    assert!(shroud.tree.is_valid_root(current_root), EINVALID_ROOT);

    // check if old nullifier exists
    assert!(!shroud.nullifiers.contains(old_leaf_nullifier), EOLD_NULLIFIER_EXISTS);
    // add old nullifier to nullifiers table
    shroud.nullifiers.add(old_leaf_nullifier, true);

    // insert new leaf into tree
    let (index, root) = shroud.tree.insert(new_leaf);

    emit(Withdrawn<T> {
        account: ctx.sender(),
        amount: amount,
    });

    emit(LeafInserted {
        index: index,
        value: new_leaf,
        new_root: root,
    });

    emit(NullifierUsed {
        nullifier: old_leaf_nullifier,
    });

    withdrawn_coin
}

public struct SwapBalance<phantom ORIGIN, phantom TARGET> {
    amount: u64,
    minimum_received: u64,
}

public fun start_swap<ORIGIN, TARGET>(
    shroud: &mut Shroud,
    amount: u64,
    minimum_received: u64,
    current_root: u256,
    old_leaf_nullifier: u256,
    new_leaf: u256,
    proof: vector<u8>,
    ctx: &mut TxContext,
): (Coin<ORIGIN>, SwapBalance<ORIGIN, TARGET>) {
    let tn = get<ORIGIN>();
    let target_tn = get<TARGET>();
    assert!(shroud.allowed_tokens.contains(&tn), ETOKEN_NOT_ALLOWED);

    let coin: &mut Coin<ORIGIN> = shroud.balances.borrow_mut(tn);
    let origin_coin = coin.split(amount, ctx);

    let mut coin_diff = coin_diff::empty(shroud.allowed_token_length, shroud.allowed_tokens);
    coin_diff.sub_coin(tn, amount);
    coin_diff.add_coin(target_tn, minimum_received);
    let diff_hash = coin_diff.final_repr();

    // verify proof
    // 1. old leaf is in tree root (current_root)
    // 2. old leaf nullifier is correct
    // 3. new leaf is calculated correctly by subtracting origin coin and
    //    adding target coin and origin coin amount >= 0
    // private address
    verify_proof(
        shroud,
        current_root,
        diff_hash,
        old_leaf_nullifier,
        new_leaf,
        proof,
        0,
        0,
    );

    // check if root valid
    assert!(shroud.tree.is_valid_root(current_root), EINVALID_ROOT);

    // check if old nullifier exists
    assert!(!shroud.nullifiers.contains(old_leaf_nullifier), EOLD_NULLIFIER_EXISTS);
    // add old nullifier to nullifiers table
    shroud.nullifiers.add(old_leaf_nullifier, true);

    let (index, root) = shroud.tree.insert(new_leaf);

    emit(LeafInserted {
        index: index,
        value: new_leaf,
        new_root: root,
    });

    emit(NullifierUsed {
        nullifier: old_leaf_nullifier,
    });

    (
        origin_coin,
        SwapBalance {
            amount: amount,
            minimum_received: minimum_received,
        },
    )
}

public fun end_swap<ORIGIN, TARGET>(
    shroud: &mut Shroud,
    balance: SwapBalance<ORIGIN, TARGET>,
    coin: Coin<TARGET>,
    _ctx: &mut TxContext,
) {
    let tn = get<TARGET>();
    assert!(shroud.allowed_tokens.contains(&tn), ETOKEN_NOT_ALLOWED);

    let SwapBalance { amount, minimum_received } = balance;
    let final_amount = coin.value();
    assert!(final_amount >= minimum_received, EINSUFFICIENT_RECEIVED);

    let prev_coin: &mut Coin<TARGET> = shroud.balances.borrow_mut(tn);
    prev_coin.join(coin);

    emit(Swapped<ORIGIN, TARGET> {
        origin_amount: amount,
        target_amount: final_amount,
    });
}

#[test]
fun test_core() {
    use sui::test_scenario::{Self, return_shared};
    use std::unit_test::assert_eq;

    let owner = @0xCAFE;

    let mut scenario = test_scenario::begin(owner);
    {
        init(scenario.ctx());
    };

    scenario.next_tx(owner);
    {
        let mut shroud = scenario.take_shared<Shroud>();
        let mut admin = scenario.take_from_sender<ShroudAdmin>();
        let vk_bytes =
            x"5231b7d586a81feda76cb9ac99a1041c5df25e99593ca32a3fe346d6107fdb9298d4e4ddef2b891f8ced8c3eb5288fe195812970a7ee83c4d0dd6d6f12f61d1c38264e379bb33d1c64a84ef52f36e085b532adbbea9d753292ffc2f1c204d714d2fd12bdca34edb07c854124aedf01f6706684907214fc9d9d672b7774f1390c5d962e6bbb9c137effbd3f77b9be6b5432f1ace7783c02e95ad4e8490025ff1009a87e8bb8a2ce92eca888b47391339636ad9960ca91ec371d0009e4be57d2132b9e303ce48ab36737a69bf90499ecab6b965c77058dbaf0417a22c528218a980700000000000000ce5d0c9aef626936aba894a1e6c9464f98c84a9797e7abc6900d4d7228824a0dfb2c74523ddba1d29f809a161d5505b13d89c1a4894dc198f0fbb15daacbc68e44d73ba92a227d59fad1e6d41326ffeb29eacd3e17553225eba9099e167cf325ff82ebddee21ca1d7249b35471abb63541de2ab02525ccf1755ce2688b046a054baa62b82b8e0862b8378a8c644a2b2d2ed8b7db1a3804efcc97d1a728abd996dfe12aa479bc67e1046edf0c58adadc1d079837fee4437bb5cc69f4a8a1c371aef19a14367aa60077da131ecc7d5ea0ccc774fa2ed7c006c3e181dbafb04dd89";
        initialize_prover(&mut admin, &mut shroud, vk_bytes);
        allow_token<shroud::usdc::USDC>(&mut admin, &mut shroud, scenario.ctx());
        allow_token<shroud::usdt::USDT>(&mut admin, &mut shroud, scenario.ctx());
        allow_token<shroud::btc::BTC>(&mut admin, &mut shroud, scenario.ctx());
        allow_token<shroud::eth::ETH>(&mut admin, &mut shroud, scenario.ctx());
        allow_token<shroud::wal::WAL>(&mut admin, &mut shroud, scenario.ctx());

        let usdc_cap = coin::create_treasury_cap_for_testing<shroud::usdc::USDC>(scenario.ctx());

        scenario.return_to_sender(admin);
        return_shared(shroud);
        transfer::public_share_object(usdc_cap);
    };

    scenario.next_tx(owner);
    {
        let shroud = scenario.take_shared<Shroud>();
        assert_eq!(
            shroud.tree.root(),
            10941962436777715901943463195175331263348098796018438960955633645115732864202,
        );
        return_shared(shroud);
    };

    scenario.end();
}
