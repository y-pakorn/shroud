pragma circom 2.1.6;

include "./poseidon.circom";
include "./merkle.circom";

template BalanceDiff(N, L) {
    signal input nonce;
    signal input before[N];
    signal input diff[N];
    signal input after[N];
    signal input merkle_root;
    signal input merkle_path[L];
    signal input merkle_indices[L];

    signal output diff_hash;
    signal output nullifier;
    signal output after_leaf;
    
    // Verify balance updates
    for (var i = 0; i < N; i++) {
        after[i] === before[i] + diff[i];
    }

    // Compute before_leaf = hash(before[0], ..., before[N-1], nonce)
    component before_poseidon = Poseidon(N + 1);
    for (var i = 0; i < N; i++) {
        before_poseidon.inputs[i] <== before[i];
    }
    before_poseidon.inputs[N] <== nonce;
    var before_leaf = before_poseidon.out;

    // Compute after_leaf = hash(after[0], ..., after[N-1], nonce)
    component after_poseidon = Poseidon(N + 1);
    for (var i = 0; i < N; i++) {
        after_poseidon.inputs[i] <== after[i];
    }
    after_poseidon.inputs[N] <== nonce;
    after_leaf <== after_poseidon.out;

    // Merkle tree inclusion proof for before_leaf
    component merkle_proof = MerkleTreeChecker(L);
    merkle_proof.leaf <== before_leaf;
    merkle_proof.root <== merkle_root;
    for (var i = 0; i < L; i++) {
        merkle_proof.pathElements[i] <== merkle_path[i];
        merkle_proof.pathIndices[i] <== merkle_indices[i];
    }

    // Nullifier check: hash(before_leaf, nonce) to prevent double-spending
    component nullifier_hasher = Poseidon(2);
    nullifier_hasher.inputs[0] <== before_leaf;
    nullifier_hasher.inputs[1] <== nonce;
    nullifier <== nullifier_hasher.out;

    // diff_hash for differences check in contract
    component diff_poseidon = Poseidon(N);
    for (var i = 0; i < N; i++) {
        diff_poseidon.inputs[i] <== diff[i];
    }
    diff_hash <== diff_poseidon.out;
}

component main { public [ merkle_root ] } = BalanceDiff(10, 24);