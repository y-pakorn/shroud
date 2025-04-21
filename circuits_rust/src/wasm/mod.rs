use ark_bn254::{Bn254, Fr};
use ark_crypto_primitives::{
    crh::{poseidon::TwoToOneCRH, TwoToOneCRHScheme},
    snark::SNARK,
};
use ark_ff::{AdditiveGroup, BigInteger, PrimeField};
use ark_groth16::{Groth16, ProvingKey};
use ark_serialize::{CanonicalDeserialize, CanonicalSerialize};
use rand::thread_rng;
use serde_json::json;
use serde_wasm_bindgen::to_value;
use wasm_bindgen::{prelude::wasm_bindgen, JsValue};

use crate::{
    merkle_tree::{Path, SparseMerkleTree},
    poseidon::poseidon_bn254,
    Circuit, ASSET_SIZE, LEVEL,
};

#[wasm_bindgen(start)]
pub fn init() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
#[derive(Debug, Clone, CanonicalSerialize, CanonicalDeserialize)]
pub struct Account {
    balance: [u64; ASSET_SIZE],
    nonce: Fr,
    address: String,
    address_fr: Fr,
    latest_seq_sync: u64,
    index: Option<usize>,
}

#[wasm_bindgen]
impl Account {
    #[wasm_bindgen(js_name = new)]
    pub fn wasm_new(address: String, nonce_bytes: String) -> Self {
        Self {
            balance: [0; ASSET_SIZE],
            nonce: Fr::from_le_bytes_mod_order(
                &hex::decode(&nonce_bytes).expect("Invalid nonce hex string"),
            ),
            address_fr: Fr::from_le_bytes_mod_order(address.as_bytes()),
            address,
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
            .map(|b| Fr::from_le_bytes_mod_order(&b))
            .collect();
    }

    #[wasm_bindgen(js_name = addLeafs)]
    pub fn wasm_add_leafs(&mut self, leafs: Vec<String>) {
        self.merkle_leafs.extend(
            leafs
                .iter()
                .map(|s| hex::decode(s).expect("Invalid hex string"))
                .map(|b| Fr::from_le_bytes_mod_order(&b)),
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
        .map(|a| Fr::from_le_bytes_mod_order(&hex::decode(&a).expect("Invalid aux hex string")))
        .unwrap_or(Fr::ZERO);
    let hasher = poseidon_bn254();
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
        .unwrap_or(Path::empty());

    let diff_hash = diff.iter().fold(Fr::ZERO, |acc, d| {
        TwoToOneCRH::evaluate(&hasher, &acc, &d).expect("Diff hash failed")
    });

    let before_leaf = before.iter().fold(state.account.nonce, |acc, b| {
        TwoToOneCRH::evaluate(&hasher, &acc, &b).expect("Before leaf hash failed")
    });

    let after_leaf = after.iter().fold(state.account.nonce, |acc, b| {
        TwoToOneCRH::evaluate(&hasher, &acc, &b).expect("After leaf hash failed")
    });

    let nullifier = TwoToOneCRH::evaluate(&hasher, &before_leaf, &state.account.nonce)
        .expect("Nullifier hash failed");

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

    let proof =
        Groth16::<Bn254>::prove(&pk, circuit, &mut thread_rng()).expect("Proof generation failed");

    let mut proof_bytes = vec![];
    proof
        .serialize_compressed(&mut proof_bytes)
        .expect("Failed to serialize proof");

    to_value(&json!({
        "proof": hex::encode(proof_bytes),
        "nullifier": hex::encode(nullifier.into_bigint().to_bytes_le()),
        "after_leaf": hex::encode(after_leaf.into_bigint().to_bytes_le()),
        "diff_hash": hex::encode(diff_hash.into_bigint().to_bytes_le()),
        "merkle_root": hex::encode(merkle_root.into_bigint().to_bytes_le()),
    }))
    .expect("Failed to serialize proof")
}
