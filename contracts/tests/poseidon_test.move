#[test_only]
module shroud::poseidon_test;

use shroud::poseidon::poseidon_bn254;

#[test]
fun correct_poseidon_hash() {
    let mut input: vector<u256> = vector::empty();
    input.push_back(0);
    input.push_back(0);

    let output_native = sui::poseidon::poseidon_bn254(&input);

    let output = poseidon_bn254(0, 0);

    assert!(output_native == output);
}
