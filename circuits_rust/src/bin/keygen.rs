use ark_bn254::Bn254;
use ark_crypto_primitives::snark::CircuitSpecificSetupSNARK;
use ark_groth16::Groth16;
use ark_serialize::CanonicalSerialize;
use circuits_rust::poseidon::PoseidonHash;
use circuits_rust::{poseidon::poseidon_bn254, Circuit};
use hex;
use rand::thread_rng;
use std::fs::File;
use std::io::Write;

pub fn main() -> anyhow::Result<()> {
    let poseidon = PoseidonHash::new(poseidon_bn254());
    let circuit = Circuit::empty(poseidon);
    let (pk, vk) = Groth16::<Bn254>::setup(circuit, &mut thread_rng())?;

    // pk uncompressed
    let mut pk_bytes = vec![];
    pk.serialize_uncompressed(&mut pk_bytes)?;

    // vk compressed
    let mut vk_bytes = vec![];
    vk.serialize_compressed(&mut vk_bytes)?;

    println!("PK size: {} bytes", pk_bytes.len());
    println!("VK size: {} bytes", vk_bytes.len());

    // Save PK to file
    let mut pk_file = File::create("pk.full.bin")?;
    pk_file.write_all(&pk_bytes)?;

    // Save VK as hex string
    let vk_hex = hex::encode(&vk_bytes);
    let mut vk_hex_file = File::create("vk.hex.bin")?;
    vk_hex_file.write_all(vk_hex.as_bytes())?;

    println!("Keys saved to pk.full.bin, vk.hex.bin");

    Ok(())
}
