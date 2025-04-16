use std::{
    borrow::Borrow,
    collections::{BTreeMap, BTreeSet},
    marker::PhantomData,
};

use anyhow::anyhow;
use ark_bn254::Fr;
use ark_crypto_primitives::{
    crh::{
        poseidon::{
            constraints::{CRHParametersVar as PoseidonParameterVar, TwoToOneCRHGadget},
            TwoToOneCRH,
        },
        TwoToOneCRHScheme, TwoToOneCRHSchemeGadget,
    },
    sponge::poseidon::PoseidonConfig,
};
use ark_ff::{AdditiveGroup, Field, PrimeField};
use ark_r1cs_std::{
    fields::fp::FpVar,
    prelude::{AllocVar, AllocationMode, Boolean, EqGadget, FieldVar},
    select::CondSelectGadget,
};
use ark_relations::r1cs::{Namespace, SynthesisError};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Path<const N: usize> {
    pub path: [(Fr, Fr); N],
}

impl<const N: usize> Path<N> {
    /// Creates a new empty path.
    pub fn empty() -> Self {
        Self {
            path: [(Fr::ZERO, Fr::ZERO); N],
        }
    }

    /// Takes in an expected `root_hash` and leaf-level data (i.e. hashes of
    /// secrets) for a leaf and checks that the leaf belongs to a tree having
    /// the expected hash.
    pub fn check_membership(
        &self,
        root_hash: &Fr,
        leaf: &Fr,
        hasher: &PoseidonConfig<Fr>,
    ) -> anyhow::Result<bool> {
        let root = self.calculate_root(leaf, hasher)?;
        Ok(root == *root_hash)
    }

    pub fn calculate_root(&self, leaf: &Fr, hasher: &PoseidonConfig<Fr>) -> anyhow::Result<Fr> {
        if *leaf != self.path[0].0 && *leaf != self.path[0].1 {
            return Err(anyhow!("Invalid leaf"));
        }

        let mut prev = *leaf;
        // Check levels between leaf level and root
        for (left_hash, right_hash) in &self.path {
            if &prev != left_hash && &prev != right_hash {
                return Err(anyhow!("Invalid path nodes"));
            }
            prev = TwoToOneCRH::evaluate(hasher, left_hash, right_hash)
                .map_err(|e| anyhow!("Hasher error: {}", e))?;
        }

        Ok(prev)
    }

    /// Given leaf data determine what the index of this leaf must be
    /// in the Merkle tree it belongs to.  Before doing so check that the leaf
    /// does indeed belong to a tree with the given `root_hash`
    pub fn get_index(
        &self,
        root_hash: &Fr,
        leaf: &Fr,
        hasher: &PoseidonConfig<Fr>,
    ) -> anyhow::Result<Fr> {
        if !self.check_membership(root_hash, leaf, hasher)? {
            return Err(anyhow!("Invalid leaf"));
        }

        let mut prev = *leaf;
        let mut index = Fr::ZERO;
        let mut twopower = Fr::ONE;
        // Check levels between leaf level and root
        for (left_hash, right_hash) in &self.path {
            // Check if the previous hash is for a left node or right node
            if &prev != left_hash {
                index += twopower;
            }
            twopower = twopower + twopower;
            prev = TwoToOneCRH::evaluate(hasher, left_hash, right_hash)
                .map_err(|e| anyhow!("Hasher error: {}", e))?;
        }

        Ok(index)
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct SparseMerkleTree<const N: usize> {
    /// A map from leaf indices to leaf data stored as field elements.
    pub tree: BTreeMap<u64, Fr>,
    /// An array of default hashes hashed with themselves `N` times.
    empty_hashes: [Fr; N],
}

impl<const N: usize> SparseMerkleTree<N> {
    /// Takes a batch of field elements, inserts
    /// these hashes into the tree, and updates the merkle root.
    pub fn insert_batch(
        &mut self,
        leaves: &BTreeMap<u32, Fr>,
        hasher: &PoseidonConfig<Fr>,
    ) -> anyhow::Result<()> {
        let last_level_index: u64 = (1u64 << N) - 1;

        let mut level_idxs: BTreeSet<u64> = BTreeSet::new();
        for (i, leaf) in leaves {
            let true_index = last_level_index + (*i as u64);
            self.tree.insert(true_index, *leaf);
            level_idxs.insert((true_index - 1) >> 1);
        }

        for level in 0..N {
            let mut new_idxs: BTreeSet<u64> = BTreeSet::new();
            for i in level_idxs {
                let left_index = 2 * i + 1;
                let right_index = 2 * i + 2;

                let empty_hash = self.empty_hashes[level];
                let left = self.tree.get(&left_index).unwrap_or(&empty_hash);
                let right = self.tree.get(&right_index).unwrap_or(&empty_hash);
                let hashed = TwoToOneCRH::evaluate(hasher, left, right)
                    .map_err(|e| anyhow!("Hasher error: {}", e))?;
                self.tree.insert(i, hashed);

                let parent = match i > 0 {
                    true => (i - 1) >> 1,
                    false => break,
                };
                new_idxs.insert(parent);
            }
            level_idxs = new_idxs;
        }

        Ok(())
    }

    /// Creates a new Sparse Merkle Tree from a map of indices to field
    /// elements.
    pub fn new(
        leaves: &BTreeMap<u32, Fr>,
        hasher: &PoseidonConfig<Fr>,
        empty_leaf: &Fr,
    ) -> anyhow::Result<Self> {
        // Ensure the tree can hold this many leaves
        let last_level_size = leaves.len().next_power_of_two();
        let tree_size = 2 * last_level_size - 1;
        let tree_height = ark_std::log2(tree_size);
        assert!(tree_height <= N as u32);

        // Initialize the merkle tree
        let tree: BTreeMap<u64, Fr> = BTreeMap::new();
        let empty_hashes = {
            let mut empty_hashes = [Fr::ZERO; N];

            let mut empty_hash = *empty_leaf;
            empty_hashes[0] = empty_hash;

            for hash in empty_hashes.iter_mut().skip(1) {
                empty_hash = TwoToOneCRH::evaluate(hasher, &empty_hash, &empty_hash)
                    .map_err(|e| anyhow!("Hasher error: {}", e))?;
                *hash = empty_hash;
            }

            anyhow::Ok(empty_hashes)
        }?;

        let mut smt = SparseMerkleTree::<N> { tree, empty_hashes };
        smt.insert_batch(leaves, hasher)?;

        Ok(smt)
    }

    /// Creates a new Sparse Merkle Tree from an array of field elements.
    pub fn new_sequential(
        leaves: &[Fr],
        hasher: &PoseidonConfig<Fr>,
        empty_leaf: &Fr,
    ) -> anyhow::Result<Self> {
        let pairs: BTreeMap<u32, Fr> = leaves
            .iter()
            .enumerate()
            .map(|(i, l)| (i as u32, *l))
            .collect();
        let smt = Self::new(&pairs, hasher, empty_leaf)?;

        Ok(smt)
    }

    /// Returns the Merkle tree root.
    pub fn root(&self) -> Fr {
        self.tree
            .get(&0)
            .cloned()
            .unwrap_or(*self.empty_hashes.last().unwrap())
    }

    /// Give the path leading from the leaf at `index` up to the root.  This is
    /// a "proof" in the sense of "valid path in a Merkle tree", not a ZK
    /// argument.
    pub fn generate_membership_proof(&self, index: u64) -> Path<N> {
        let mut path = [(Fr::ZERO, Fr::ZERO); N];

        let tree_index = index + (1u64 << N) - 1;

        // Iterate from the leaf up to the root, storing all intermediate hash values.
        let mut current_node = tree_index;
        let mut level = 0;
        while current_node != 0 {
            let sibling_node = if current_node % 2 == 1 {
                current_node + 1
            } else {
                current_node - 1
            };

            let empty_hash = &self.empty_hashes[level];

            let current = self.tree.get(&current_node).cloned().unwrap_or(*empty_hash);
            let sibling = self.tree.get(&sibling_node).cloned().unwrap_or(*empty_hash);

            if current_node % 2 == 1 {
                path[level] = (current, sibling);
            } else {
                path[level] = (sibling, current);
            }
            current_node = (current_node - 1) >> 1;
            level += 1;
        }

        Path { path }
    }
}

/// Gadgets for one Merkle tree path
#[derive(Debug, Clone)]
pub struct PathVar<const N: usize> {
    path: [(FpVar<Fr>, FpVar<Fr>); N],
}

impl<const N: usize> PathVar<N> {
    /// check whether path belongs to merkle path (does not check if indexes
    /// match)
    pub fn check_membership(
        &self,
        root: &FpVar<Fr>,
        leaf: &FpVar<Fr>,
        hasher: &PoseidonParameterVar<Fr>,
    ) -> Result<Boolean<Fr>, SynthesisError> {
        let computed_root = self.root_hash(leaf, hasher)?;

        root.is_eq(&computed_root)
    }

    /// Creates circuit to calculate merkle root and deny any invalid paths
    pub fn root_hash(
        &self,
        leaf: &FpVar<Fr>,
        hasher: &PoseidonParameterVar<Fr>,
    ) -> Result<FpVar<Fr>, SynthesisError> {
        assert_eq!(self.path.len(), N);
        let mut previous_hash = leaf.clone();

        for (p_left_hash, p_right_hash) in self.path.iter() {
            let previous_is_left = previous_hash.is_eq(p_left_hash)?;

            let left_hash =
                FpVar::conditionally_select(&previous_is_left, &previous_hash, p_left_hash)?;
            let right_hash =
                FpVar::conditionally_select(&previous_is_left, p_right_hash, &previous_hash)?;

            previous_hash = TwoToOneCRHGadget::evaluate(hasher, &left_hash, &right_hash)?;
        }

        Ok(previous_hash)
    }

    /// Creates circuit to get index of a leaf hash
    pub fn get_index(
        &self,
        leaf: &FpVar<Fr>,
        hasher: &PoseidonParameterVar<Fr>,
    ) -> Result<FpVar<Fr>, SynthesisError> {
        let mut index = FpVar::<Fr>::zero();
        let mut twopower = FpVar::<Fr>::one();
        let mut rightvalue: FpVar<Fr>;

        // Check levels between leaf level and root.
        let mut previous_hash = leaf.clone();
        for (left_hash, right_hash) in self.path.iter() {
            // Check if the previous_hash is for a left node.
            let previous_is_left = previous_hash.is_eq(left_hash)?;

            rightvalue = &index + &twopower;
            index = FpVar::<Fr>::conditionally_select(&previous_is_left, &index, &rightvalue)?;
            twopower = &twopower + &twopower;

            previous_hash = TwoToOneCRHGadget::evaluate(hasher, &left_hash, &right_hash)?;
        }

        Ok(index)
    }
}

impl<const N: usize> AllocVar<Path<N>, Fr> for PathVar<N> {
    fn new_variable<T: Borrow<Path<N>>>(
        cs: impl Into<Namespace<Fr>>,
        f: impl FnOnce() -> Result<T, SynthesisError>,
        mode: AllocationMode,
    ) -> Result<Self, SynthesisError> {
        let ns = cs.into();
        let cs = ns.cs();

        let mut path = Vec::new();
        let path_obj = f()?;
        for (l, r) in &path_obj.borrow().path {
            let l_hash =
                FpVar::<Fr>::new_variable(ark_relations::ns!(cs, "l_child"), || Ok(*l), mode)?;
            let r_hash =
                FpVar::<Fr>::new_variable(ark_relations::ns!(cs, "r_child"), || Ok(*r), mode)?;
            path.push((l_hash, r_hash));
        }

        Ok(PathVar {
            path: path.try_into().unwrap_or_else(
                #[allow(clippy::type_complexity)]
                |v: Vec<(FpVar<Fr>, FpVar<Fr>)>| {
                    panic!("Expected a Vec of length {} but it was {}", N, v.len())
                },
            ),
        })
    }
}
