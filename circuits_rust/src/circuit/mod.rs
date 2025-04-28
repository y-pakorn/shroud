use ark_bn254::Fr;
use ark_ff::AdditiveGroup;
use ark_r1cs_std::{
    fields::fp::FpVar,
    prelude::{AllocVar, Boolean, EqGadget, FieldVar},
};
use ark_relations::{
    ns,
    r1cs::{self, ConstraintSynthesizer, ConstraintSystemRef},
};

use crate::{
    merkle_tree::{Path, PathVar},
    poseidon::{PoseidonHash, PoseidonHashVar},
};

#[derive(Debug, Clone)]
pub struct MainCircuit<const L: usize, const N: usize> {
    pub nonce: Fr,
    pub before: [Fr; N],
    pub diff: [Fr; N],
    pub after: [Fr; N],
    pub merkle_root: Fr, // public
    pub merkle_path: Path<L>,
    pub diff_hash: Fr,        // public
    pub nullifier: Fr,        // public
    pub after_leaf: Fr,       // public
    pub hasher: PoseidonHash, // constant
    pub address: Fr,
    pub public_address: Fr, // public
    pub aux: Fr,            // public
}

impl<const L: usize, const N: usize> MainCircuit<L, N> {
    pub fn empty(hasher: PoseidonHash) -> Self {
        Self {
            nonce: Fr::ZERO,
            before: [Fr::ZERO; N],
            diff: [Fr::ZERO; N],
            after: [Fr::ZERO; N],
            merkle_root: Fr::ZERO,
            merkle_path: Path::empty(),
            diff_hash: Fr::ZERO,
            nullifier: Fr::ZERO,
            after_leaf: Fr::ZERO,
            aux: Fr::ZERO,
            hasher,
            address: Fr::ZERO,
            public_address: Fr::ZERO,
        }
    }
}

impl<const L: usize, const N: usize> ConstraintSynthesizer<Fr> for MainCircuit<L, N> {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> r1cs::Result<()> {
        let merkle_root_var = FpVar::new_input(ns!(cs, "merkle_root"), || Ok(self.merkle_root))?;
        let diff_hash_var = FpVar::new_input(ns!(cs, "diff_hash"), || Ok(self.diff_hash))?;
        let nullifier_var = FpVar::new_input(ns!(cs, "nullifier"), || Ok(self.nullifier))?;
        let after_leaf_var = FpVar::new_input(ns!(cs, "after_leaf"), || Ok(self.after_leaf))?;
        let public_address_var =
            FpVar::new_input(ns!(cs, "public_address"), || Ok(self.public_address))?;
        let _aux_var = FpVar::new_input(ns!(cs, "aux"), || Ok(self.aux))?;

        let zero_var = FpVar::<Fr>::constant(Fr::ZERO);
        let poseidon_hash_var =
            PoseidonHashVar::new_constant(ns!(cs, "poseidon_parameter"), self.hasher)?;

        let merkle_path_var =
            PathVar::new_witness(ns!(cs, "merkle_path"), || Ok(self.merkle_path))?;
        let nonce_var = FpVar::new_witness(ns!(cs, "nonce"), || Ok(self.nonce))?;
        let before_var = Vec::<FpVar<Fr>>::new_witness(ns!(cs, "before"), || Ok(self.before))?;
        let diff_var = Vec::<FpVar<Fr>>::new_witness(ns!(cs, "diff"), || Ok(self.diff))?;
        let after_var = Vec::<FpVar<Fr>>::new_witness(ns!(cs, "after"), || Ok(self.after))?;
        let address_var = FpVar::new_witness(ns!(cs, "address"), || Ok(self.address))?;

        // check for balance updates
        for i in 0..N {
            // check if after = before + diff
            after_var[i].enforce_equal(&(before_var[i].clone() + diff_var[i].clone()))?;
            // check if after is smaller than mod - 1 / 2 (>= 0)
            after_var[i].enforce_smaller_or_equal_than_mod_minus_one_div_two()?;
        }

        // P = H(address, nonce)
        let prehash = poseidon_hash_var.hash(&address_var, &nonce_var)?;

        // empty_leaf = H(H(P, 0), 0), ....
        let empty_leaf = (0..N).try_fold(prehash.clone(), |acc, _| {
            poseidon_hash_var.hash(&acc, &zero_var)
        })?;

        // before_leaf = H(H(P, before[0]), before[1]), ....
        let before_leaf = before_var
            .iter()
            .try_fold(prehash.clone(), |acc, v| poseidon_hash_var.hash(&acc, v))?;

        // after_leaf = H(H(P, after[0]), after[1]), ....
        let after_leaf = after_var
            .iter()
            .try_fold(prehash.clone(), |acc, v| poseidon_hash_var.hash(&acc, v))?;

        // check if after_leaf is eq to after_leaf_var
        after_leaf.enforce_equal(&after_leaf_var)?;

        // diff_hash = H(H(0, diff[0]), diff[1]), ....
        let diff_hash = diff_var
            .iter()
            .try_fold(zero_var.clone(), |acc, v| poseidon_hash_var.hash(&acc, v))?;

        // check if diff_hash is eq to diff_hash_var
        diff_hash.enforce_equal(&diff_hash_var)?;

        // check if merkle_path is valid
        let is_before_membership_valid =
            merkle_path_var.check_membership(&merkle_root_var, &before_leaf, &poseidon_hash_var)?;

        // public address need to be equal to address (public ops) or zero (private ops)
        (public_address_var.is_eq(&address_var)? | public_address_var.is_zero()?)
            .enforce_equal(&Boolean::TRUE)?;

        let nullifier = poseidon_hash_var.hash(&before_leaf, &nonce_var)?;

        // if before_leaf == empty_leaf && nullifier == 0
        // -> check for valid nullifier and valid membership proof
        ((before_leaf.is_eq(&empty_leaf)? & nullifier_var.is_eq(&zero_var)?)
            | (nullifier.is_eq(&nullifier_var)? & is_before_membership_valid))
            .enforce_equal(&Boolean::TRUE)?;

        Ok(())
    }
}
