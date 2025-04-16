use circuit::MainCircuit;

pub mod circuit;
pub mod merkle_tree;
pub mod poseidon;
pub mod wasm;

pub const LEVEL: usize = 20;
pub const ASSET_SIZE: usize = 5;
pub type Circuit = MainCircuit<LEVEL, ASSET_SIZE>;
