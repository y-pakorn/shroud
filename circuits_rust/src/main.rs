use ark_bn254::Fr;
use ark_relations::r1cs::{ConstraintSynthesizer, ConstraintSystem};

use circuits_rust::{poseidon::poseidon_bn254, Circuit};

fn main() -> anyhow::Result<()> {
    let cs = ConstraintSystem::<Fr>::new_ref();
    let poseidon = poseidon_bn254();
    Circuit::empty(poseidon).generate_constraints(cs.clone())?;

    println!("Constraints: {}", cs.num_constraints());

    Ok(())
}
