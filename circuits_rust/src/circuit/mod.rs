use ark_bn254::Fr;
use ark_crypto_primitives::{
    crh::{
        poseidon::{
            constraints::{CRHParametersVar as PoseidonVar, TwoToOneCRHGadget as PoseidonGadget},
            TwoToOneCRH,
        },
        TwoToOneCRHScheme, TwoToOneCRHSchemeGadget,
    },
    sponge::poseidon::PoseidonConfig,
};
use ark_ff::AdditiveGroup;
use ark_r1cs_std::{
    fields::fp::FpVar,
    prelude::{AllocVar, Boolean, EqGadget, FieldVar},
};
use ark_relations::{
    ns,
    r1cs::{self, ConstraintSynthesizer, ConstraintSystemRef},
};

use crate::merkle_tree::{Path, PathVar};

pub struct MainCircuit<const L: usize, const N: usize> {
    pub nonce: Fr,
    pub before: [Fr; N],
    pub diff: [Fr; N],
    pub after: [Fr; N],
    pub merkle_root: Fr, // public
    pub merkle_path: Path<L>,
    pub diff_hash: Fr,              // public
    pub nullifier: Fr,              // public
    pub after_leaf: Fr,             // public
    pub hasher: PoseidonConfig<Fr>, // constant
}

impl<const L: usize, const N: usize> MainCircuit<L, N> {
    pub fn empty(hasher: PoseidonConfig<Fr>) -> Self {
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
            hasher,
        }
    }
}

impl<const L: usize, const N: usize> ConstraintSynthesizer<Fr> for MainCircuit<L, N> {
    fn generate_constraints(self, cs: ConstraintSystemRef<Fr>) -> r1cs::Result<()> {
        let zero_balance_hash = FpVar::<Fr>::new_constant(
            ns!(cs, "zero_balance"),
            &[Fr::ZERO; N].iter().fold(self.nonce, |acc, v| {
                TwoToOneCRH::evaluate(&self.hasher, &acc, v).expect("Zero hash won't fail")
            }),
        )?;
        let nonce_var = FpVar::new_witness(ns!(cs, "nonce"), || Ok(self.nonce))?;
        let before_var = Vec::<FpVar<Fr>>::new_witness(ns!(cs, "before"), || Ok(self.before))?;
        let diff_var = Vec::<FpVar<Fr>>::new_witness(ns!(cs, "diff"), || Ok(self.diff))?;
        let after_var = Vec::<FpVar<Fr>>::new_witness(ns!(cs, "after"), || Ok(self.after))?;
        let merkle_root_var = FpVar::new_input(ns!(cs, "merkle_root"), || Ok(self.merkle_root))?;
        let merkle_path_var =
            PathVar::new_witness(ns!(cs, "merkle_path"), || Ok(self.merkle_path))?;
        let diff_hash_var = FpVar::new_input(ns!(cs, "diff_hash"), || Ok(self.diff_hash))?;
        let nullifier_var = FpVar::new_input(ns!(cs, "nullifier"), || Ok(self.nullifier))?;
        let after_leaf_var = FpVar::new_input(ns!(cs, "after_leaf"), || Ok(self.after_leaf))?;
        let zero_var = FpVar::<Fr>::constant(Fr::ZERO);

        let poseidon_parameter_var =
            PoseidonVar::new_constant(ns!(cs, "poseidon_parameter"), self.hasher)?;

        // check for balance updates
        for i in 0..N {
            // check if after = before + diff
            after_var[i].enforce_equal(&(before_var[i].clone() + diff_var[i].clone()))?;
            // check if after is smaller than mod - 1 / 2 (>= 0)
            after_var[i].enforce_smaller_or_equal_than_mod_minus_one_div_two()?;
        }

        // before_leaf = H(H(nonce, before[0]), before[1]), ....
        let before_leaf = before_var.iter().try_fold(nonce_var.clone(), |acc, v| {
            PoseidonGadget::evaluate(&poseidon_parameter_var, &acc, v)
        })?;

        // after_leaf = H(H(nonce, after[0]), after[1]), ....
        let after_leaf = after_var.iter().try_fold(nonce_var.clone(), |acc, v| {
            PoseidonGadget::evaluate(&poseidon_parameter_var, &acc, v)
        })?;

        // check if after_leaf is eq to after_leaf_var
        after_leaf.enforce_equal(&after_leaf_var)?;

        // diff_hash = H(H(0, diff[0]), diff[1]), ....
        let diff_hash = diff_var.iter().try_fold(zero_var.clone(), |acc, v| {
            PoseidonGadget::evaluate(&poseidon_parameter_var, &acc, v)
        })?;

        // check if diff_hash is eq to diff_hash_var
        diff_hash.enforce_equal(&diff_hash_var)?;

        // check if merkle_path is valid
        let is_before_membership_valid = merkle_path_var.check_membership(
            &merkle_root_var,
            &before_leaf,
            &poseidon_parameter_var,
        )?;

        let nullifier =
            PoseidonGadget::evaluate(&poseidon_parameter_var, &before_leaf, &nonce_var)?;

        // if before_leaf == zero_balance_hash && nullifier == 0
        // -> check for valid nullifier and valid membership proof
        ((before_leaf.is_eq(&zero_balance_hash)? & nullifier.is_eq(&zero_var)?)
            | (nullifier.is_eq(&nullifier_var)? & is_before_membership_valid))
            .enforce_equal(&Boolean::TRUE)?;

        Ok(())
    }
}
