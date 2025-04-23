use ark_bn254::Fr;
use ark_ff::AdditiveGroup;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystem};

use circuits_rust::{
    merkle_tree::SparseMerkleTree,
    poseidon::{poseidon_bn254, PoseidonHash},
    Circuit,
};

fn main() -> anyhow::Result<()> {
    let cs = ConstraintSystem::<Fr>::new_ref();
    let poseidon = PoseidonHash::new(poseidon_bn254());
    Circuit::empty(poseidon.clone()).generate_constraints(cs.clone())?;

    println!("Constraints: {}", cs.num_constraints());

    let result = poseidon.hash(&Fr::ZERO, &Fr::ZERO);
    println!("H(0, 0) = {}", result);

    let merkle = SparseMerkleTree::<20>::new_sequential(&[], &poseidon, &Fr::ZERO)?;
    let root = merkle.root();
    println!("Empty tree root: {}", root);

    Ok(())
}
