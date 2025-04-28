use ark_bn254::{Bn254, Fr};
use ark_crypto_primitives::snark::SNARK;
use ark_ff::{AdditiveGroup, BigInteger, PrimeField};
use ark_groth16::{Groth16, ProvingKey};
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystem};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use rand::thread_rng;
use serde_json::json;
use serde_wasm_bindgen::to_value;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

use crate::{
    merkle_tree::SparseMerkleTree,
    poseidon::{poseidon_bn254, PoseidonHash},
    Circuit, ASSET_SIZE, LEVEL,
};

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    // Note that this is using the `log` function imported above during
    // `bare_bones`
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[wasm_bindgen]
#[derive(Debug, Clone, CanonicalSerialize, CanonicalDeserialize)]
pub struct Account {
    balance: [u64; ASSET_SIZE],
    nonce: Fr,
    address_fr: Fr,
    latest_seq_sync: u64,
    index: Option<usize>,
}

#[wasm_bindgen]
impl Account {
    #[wasm_bindgen(js_name = new)]
    pub fn wasm_new(address_hex: String, nonce_bytes: String) -> Self {
        Self {
            balance: [0; ASSET_SIZE],
            nonce: Fr::from_be_bytes_mod_order(
                &hex::decode(&nonce_bytes).expect("Invalid nonce hex string"),
            ),
            address_fr: Fr::from_be_bytes_mod_order(
                &hex::decode(&address_hex).expect("Invalid address hex string"),
            ),
            latest_seq_sync: 0,
            index: None,
        }
    }

    #[wasm_bindgen(js_name = getBalance)]
    pub fn wasm_get_balance(&self, asset_id: u64) -> u64 {
        self.balance[asset_id as usize]
    }

    #[wasm_bindgen(js_name = getBalances)]
    pub fn wasm_get_balances(&self) -> Vec<u64> {
        self.balance.to_vec()
    }

    #[wasm_bindgen(js_name = setBalance)]
    pub fn wasm_set_balance(&mut self, asset_id: u64, balance: u64) {
        self.balance[asset_id as usize] = balance;
    }

    #[wasm_bindgen(js_name = getIndex)]
    pub fn wasm_get_index(&self) -> Option<usize> {
        self.index
    }

    #[wasm_bindgen(js_name = setIndex)]
    pub fn wasm_set_index(&mut self, index: usize) {
        self.index = Some(index);
    }

    #[wasm_bindgen(js_name = export)]
    pub fn wasm_export(&self) -> Vec<u8> {
        let mut data = vec![];
        self.serialize_compressed(&mut data)
            .expect("Failed to serialize");
        data
    }

    #[wasm_bindgen(js_name = import)]
    pub fn wasm_import(data: &[u8]) -> Self {
        Self::deserialize_compressed(data).expect("Failed to deserialize")
    }
}

#[wasm_bindgen]
#[derive(Debug, Clone, CanonicalSerialize, CanonicalDeserialize)]
pub struct State {
    account: Account,
    merkle_leafs: Vec<Fr>,
}

#[wasm_bindgen]
impl State {
    #[wasm_bindgen(js_name = new)]
    pub fn wasm_new(account: Account) -> Self {
        Self {
            account,
            merkle_leafs: vec![],
        }
    }

    #[wasm_bindgen(js_name = setLeafs)]
    pub fn wasm_set_leafs(&mut self, leafs: Vec<String>) {
        self.merkle_leafs = leafs
            .iter()
            .map(|s| hex::decode(s).expect("Invalid hex string"))
            .map(|b| Fr::from_be_bytes_mod_order(&b))
            .collect();
    }

    #[wasm_bindgen(js_name = addLeafs)]
    pub fn wasm_add_leafs(&mut self, leafs: Vec<String>) {
        self.merkle_leafs.extend(
            leafs
                .iter()
                .map(|s| hex::decode(s).expect("Invalid hex string"))
                .map(|b| Fr::from_be_bytes_mod_order(&b)),
        );
    }

    #[wasm_bindgen(js_name = getLeafs)]
    pub fn wasm_get_leafs(&self) -> Vec<String> {
        self.merkle_leafs
            .iter()
            .map(|fr| hex::encode(fr.into_bigint().to_bytes_le()))
            .collect()
    }

    #[wasm_bindgen(js_name = getLeafsLength)]
    pub fn wasm_get_leafs_length(&self) -> usize {
        self.merkle_leafs.len()
    }
}

#[wasm_bindgen]
pub fn prove(
    state: State,
    pk_bytes: Vec<u8>,
    diffs: Vec<i64>,
    is_public: bool,
    aux: Option<String>,
) -> JsValue {
    // deserialize uncompressed pk
    let pk = ProvingKey::<Bn254>::deserialize_uncompressed_unchecked(&pk_bytes[..])
        .expect("Failed to deserialize pk");
    let aux_fr = aux
        .map(|a| Fr::from_be_bytes_mod_order(&hex::decode(&a).expect("Invalid aux hex string")))
        .unwrap_or(Fr::ZERO);
    let hasher = PoseidonHash::new(poseidon_bn254());
    let before = state.account.balance.map(|b| Fr::from(b));
    let diff: [Fr; ASSET_SIZE] = diffs
        .iter()
        .map(|b| Fr::from(*b))
        .collect::<Vec<_>>()
        .try_into()
        .expect("Invalid diff sizes");
    let after: [Fr; ASSET_SIZE] = before
        .iter()
        .zip(diff.iter())
        .map(|(b, d)| b + d)
        .collect::<Vec<_>>()
        .try_into()
        .expect("Invalid after sizes");

    let merkle_tree =
        SparseMerkleTree::<LEVEL>::new_sequential(&state.merkle_leafs, &hasher, &Fr::ZERO)
            .expect("Invalid merkle tree construction");

    let merkle_root = merkle_tree.root();
    let merkle_path = state
        .account
        .index
        .map(|i| merkle_tree.generate_membership_proof(i as u64))
        .unwrap_or(merkle_tree.generate_membership_proof(0));

    let diff_hash = diff.iter().fold(Fr::ZERO, |acc, d| hasher.hash(&acc, &d));

    let prehash = hasher.hash(&state.account.address_fr, &state.account.nonce);
    let before_leaf = before.iter().fold(prehash, |acc, b| hasher.hash(&acc, &b));
    let after_leaf = after.iter().fold(prehash, |acc, b| hasher.hash(&acc, &b));

    let nullifier = match state.account.index {
        Some(_) => hasher.hash(&before_leaf, &state.account.nonce),
        None => Fr::ZERO,
    };
    let after_nullifier = hasher.hash(&after_leaf, &state.account.nonce);

    console_log!("Address: {}", state.account.address_fr);
    console_log!("Nonce: {}", state.account.nonce);
    console_log!(
        "Public address: {}",
        if is_public {
            state.account.address_fr
        } else {
            Fr::ZERO
        }
    );
    console_log!("Before: {:?}", before);
    console_log!("Diff: {:?}", diff);
    console_log!("After: {:?}", after);
    console_log!("Nullifier: {}", nullifier);
    console_log!("After nullifier: {}", after_nullifier);
    console_log!("Diff hash: {}", diff_hash);
    console_log!("Merkle root: {}", merkle_root);
    console_log!("Merkle path: {:?}", merkle_path);
    console_log!("Before leaf: {}", before_leaf);
    console_log!("After leaf: {}", after_leaf);
    console_log!("Aux: {}", aux_fr);

    let circuit = Circuit {
        nonce: state.account.nonce,
        address: state.account.address_fr,
        public_address: if is_public {
            state.account.address_fr
        } else {
            Fr::ZERO
        },
        before,
        diff,
        after,
        merkle_root,
        merkle_path,
        diff_hash,
        nullifier,
        after_leaf,
        hasher,
        aux: aux_fr,
    };

    let cs = ConstraintSystem::<Fr>::new_ref();
    circuit
        .clone()
        .generate_constraints(cs.clone())
        .expect("Failed to generate constraints");
    if !cs.is_satisfied().expect("Failed to check constraints") {
        panic!("Constraints are not satisfied");
    }

    let proof =
        Groth16::<Bn254>::prove(&pk, circuit, &mut thread_rng()).expect("Proof generation failed");

    let mut proof_bytes = vec![];
    proof
        .serialize_compressed(&mut proof_bytes)
        .expect("Failed to serialize proof");

    let mut public_inputs_serialized = Vec::new();
    merkle_root
        .serialize_compressed(&mut public_inputs_serialized)
        .expect("Failed to serialize merkle root");
    diff_hash
        .serialize_compressed(&mut public_inputs_serialized)
        .expect("Failed to serialize diff hash");
    nullifier
        .serialize_compressed(&mut public_inputs_serialized)
        .expect("Failed to serialize nullifier");
    after_leaf
        .serialize_compressed(&mut public_inputs_serialized)
        .expect("Failed to serialize after leaf");
    (if is_public {
        state.account.address_fr
    } else {
        Fr::ZERO
    })
    .serialize_compressed(&mut public_inputs_serialized)
    .expect("Failed to serialize public address");
    aux_fr
        .serialize_compressed(&mut public_inputs_serialized)
        .expect("Failed to serialize aux");

    to_value(&json!({
        "proof": hex::encode(proof_bytes),
        "address": hex::encode(state.account.address_fr.into_bigint().to_bytes_be()),
        "nullifier": hex::encode(nullifier.into_bigint().to_bytes_be()),
        "after_leaf": hex::encode(after_leaf.into_bigint().to_bytes_be()),
        "after_nullifier": hex::encode(after_nullifier.into_bigint().to_bytes_be()),
        "diff_hash": hex::encode(diff_hash.into_bigint().to_bytes_be()),
        "merkle_root": hex::encode(merkle_root.into_bigint().to_bytes_be()),
        "public_inputs": hex::encode(public_inputs_serialized),
    }))
    .expect("Failed to serialize proof")
}
