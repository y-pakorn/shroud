use circuit::MainCircuit;

pub mod circuit;
pub mod merkle_tree;
pub mod poseidon;

pub type Circuit = MainCircuit<20, 5>;
