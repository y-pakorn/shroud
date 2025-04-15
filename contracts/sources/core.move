/// Module: shroud
module shroud::core;

use shroud::merkle::{Self, MerkleTree};
use std::type_name::{TypeName, get};
use sui::coin::{Self, Coin};
use sui::event::emit;
use sui::object_bag::{Self, ObjectBag};
use sui::table::{Self, Table};

const ETREE_NOT_EMPTY: u64 = 0x1;
const ETOKEN_NOT_ALLOWED: u64 = 0x2;
const EOLD_NULLIFIER_EXISTS: u64 = 0x3;
const EINVALID_ROOT: u64 = 0x4;

public struct Shroud has key, store {
    id: UID,
    tree: MerkleTree,
    nullifiers: Table<u256, bool>,
    balances: ObjectBag,
    allowed_tokens: vector<TypeName>,
}

public struct ShroudAdmin has key {
    id: UID,
}

// --- EVENTS ---

public struct Deposited has copy, drop {
    account: address,
    coin_type: TypeName,
    value: u64,
    index: u64,
    new_root: u256,
}

public struct Withdrawn has copy, drop {
    account: address,
    coin_type: TypeName,
    value: u64,
    index: u64,
    new_root: u256,
}

public struct NullifierUsed has copy, drop {
    nullifier: u256,
}

// --- FUNCTIONS ---

fun init(ctx: &mut TxContext) {
    let shroud = Shroud {
        id: object::new(ctx),
        tree: merkle::new(24, 20, 0, ctx),
        nullifiers: table::new(ctx),
        balances: object_bag::new(ctx),
        allowed_tokens: vector::empty(),
    };
    transfer::share_object(shroud);
    transfer::transfer(ShroudAdmin { id: object::new(ctx) }, ctx.sender());
}

public fun allow_token<T>(shroud: &mut Shroud, ctx: &mut TxContext) {
    assert!(shroud.tree.size() == 0, ETREE_NOT_EMPTY);

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

    let value = coin.value();
    let prev_coin: &mut Coin<T> = shroud.balances.borrow_mut(tn);
    prev_coin.join(coin);

    // verify proof
    // 1. old leaf is in tree root (current_root)
    // 2. old leaf nullifier is correct
    // 3. new leaf is calculated correctly by adding correct coin
    //    value with correct coin type to the old leaf
    // TODO: implement proof verification

    // check if root valid
    assert!(shroud.tree.is_valid_root(current_root), EINVALID_ROOT);

    // check if old nullifier exists
    assert!(!shroud.nullifiers.contains(old_leaf_nullifier), EOLD_NULLIFIER_EXISTS);
    // add old nullifier to nullifiers table
    shroud.nullifiers.add(old_leaf_nullifier, true);

    // insert new leaf into tree
    let (index, root) = shroud.tree.insert(new_leaf);

    emit(Deposited {
        account: ctx.sender(),
        coin_type: tn,
        value: value,
        index: index,
        new_root: root,
    });

    emit(NullifierUsed {
        nullifier: old_leaf_nullifier,
    });
}

public fun withdraw<T>(
    shroud: &mut Shroud,
    value: u64,
    current_root: u256,
    old_leaf_nullifier: u256,
    new_leaf: u256,
    proof: vector<u8>,
    ctx: &mut TxContext,
): Coin<T> {
    let tn = get<T>();
    assert!(shroud.allowed_tokens.contains(&tn), ETOKEN_NOT_ALLOWED);

    let prev_coin: &mut Coin<T> = shroud.balances.borrow_mut(tn);
    let withdrawn_coin = prev_coin.split(value, ctx);

    // verify proof
    // 1. old leaf is in tree root (current_root)
    // 2. old leaf nullifier is correct
    // 3. new leaf is calculated correctly by subtracting correct coin
    //    value with correct coin type to the old leaf and final amount >= 0
    // TODO: implement proof verification

    // check if root valid
    assert!(shroud.tree.is_valid_root(current_root), EINVALID_ROOT);

    // check if old nullifier exists
    assert!(!shroud.nullifiers.contains(old_leaf_nullifier), EOLD_NULLIFIER_EXISTS);
    // add old nullifier to nullifiers table
    shroud.nullifiers.add(old_leaf_nullifier, true);

    // insert new leaf into tree
    let (index, root) = shroud.tree.insert(new_leaf);

    emit(Withdrawn {
        account: ctx.sender(),
        coin_type: tn,
        value: value,
        index: index,
        new_root: root,
    });

    emit(NullifierUsed {
        nullifier: old_leaf_nullifier,
    });

    withdrawn_coin
}
