use ark_bn254::Fr;
use ark_crypto_primitives::crh::{
    poseidon::{TwoToOneCRH, CRH},
    CRHScheme, TwoToOneCRHScheme,
};
use ark_ff::AdditiveGroup;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystem};

use circuits_rust::{poseidon::poseidon_bn254, Circuit};

fn main() -> anyhow::Result<()> {
    let cs = ConstraintSystem::<Fr>::new_ref();
    let poseidon = poseidon_bn254();
    Circuit::empty(poseidon.clone()).generate_constraints(cs.clone())?;

    println!("Constraints: {}", cs.num_constraints());

    let result = TwoToOneCRH::evaluate(&poseidon, &Fr::ZERO, &Fr::ZERO).expect("Should not fail");
    println!("H(0, 0) = {}", result);

    let result2nd = CRH::evaluate(&poseidon, [Fr::ZERO, Fr::ZERO]).expect("Should not fail");
    println!("H([0, 0]) = {}", result2nd);

    Ok(())
}
