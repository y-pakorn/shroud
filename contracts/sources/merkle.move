module shroud::merkle;

use sui::poseidon::poseidon_bn254;
use sui::table::{Self, Table};

const EINVALID_INDEX: u64 = 0x200001;
const EINVALID_LEVEL: u64 = 0x200002;
const EINVALID_VALID_SIZE: u64 = 0x200003;

public struct MerkleTree has key, store {
    id: UID,
    hashes: vector<u256>,
    zeros: vector<u256>,
    leafs: Table<u64, u256>,
    level: u64,
    root: u256,
    valid_size: u64,
    valid_roots: vector<u256>,
}

public fun new(level: u64, valid_size: u64, default_leaf: u256, ctx: &mut TxContext): MerkleTree {
    assert!(level > 1, EINVALID_LEVEL);
    assert!(valid_size > 0, EINVALID_VALID_SIZE);

    let mut hashes = vector::empty();
    hashes.push_back(default_leaf);

    let mut i = 1;
    while (i < level) {
        let latest = hashes[hashes.length() - 1];
        let mut to_hash = vector::empty();
        to_hash.push_back(latest);
        to_hash.push_back(latest);
        let hashed = poseidon_bn254(&to_hash);
        hashes.push_back(hashed);
        i = i + 1;
    };
    let mut valid_roots = vector::empty();
    let root = hashes[hashes.length() - 1];
    valid_roots.push_back(root);
    MerkleTree {
        id: object::new(ctx),
        hashes: hashes,
        zeros: hashes,
        leafs: table::new(ctx),
        level: level,
        root: root,
        valid_size: valid_size,
        valid_roots: valid_roots,
    }
}

public fun insert(tree: &mut MerkleTree, leaf: u256): (u64, u256) {
    let index = tree.leafs.length();
    assert!(index < tree.level, EINVALID_INDEX);
    tree.leafs.add(index, leaf);

    let mut cur_hash = leaf;
    let mut cur_idx = index;
    let mut i = 0;

    while (i < tree.level) {
        let (left, right) = if (cur_idx % 2 == 0) {
            tree.hashes.push_back(cur_hash);
            tree.hashes.swap_remove(i);
            (cur_hash, tree.zeros[i])
        } else {
            (tree.hashes[i], cur_hash)
        };

        let mut to_hash = vector::empty();
        to_hash.push_back(left);
        to_hash.push_back(right);
        cur_hash = poseidon_bn254(&to_hash);
        cur_idx = cur_idx / 2;
        i = i + 1;
    };

    // update root
    tree.root = cur_hash;

    let mut new_valid_roots = vector::empty();
    let mut j = 1;
    while (j < tree.valid_roots.length()) {
        new_valid_roots.push_back(tree.valid_roots[j]);
        j = j + 1;
    };
    new_valid_roots.push_back(cur_hash);
    tree.valid_roots = new_valid_roots;

    (index, cur_hash)
}

public fun root(tree: &MerkleTree): u256 {
    tree.root
}

public fun is_valid_root(tree: &MerkleTree, root: u256): bool {
    tree.valid_roots.contains(&root)
}

public fun size(tree: &MerkleTree): u64 {
    tree.leafs.length()
}
