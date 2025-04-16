module shroud::coin_diff;

use shroud::fr::{Self, FR};
use std::type_name::TypeName;
use sui::poseidon::poseidon_bn254;
use sui::vec_map::{Self, VecMap};

public struct CoinDiff has copy, drop {
    total: u64,
    map: VecMap<TypeName, FR>,
}

public fun empty(total: u64, allowed_tokens: vector<TypeName>): CoinDiff {
    let mut coin_diff_array = vec_map::empty<TypeName, FR>();
    allowed_tokens.do_ref!(|token| {
        coin_diff_array.insert(*token, fr::zero());
    });
    CoinDiff { total, map: coin_diff_array }
}

public fun add_coin(coin_diff: &mut CoinDiff, coin_type: TypeName, amount: u64) {
    if (coin_diff.map.contains(&coin_type)) {
        let current_amount = coin_diff.map.get_mut(&coin_type);
        *current_amount = (*current_amount).add(fr::from_u64(amount));
    } else {
        coin_diff.map.insert(coin_type, fr::from_u64(amount));
    }
}

public fun sub_coin(coin_diff: &mut CoinDiff, coin_type: TypeName, amount: u64) {
    if (coin_diff.map.contains(&coin_type)) {
        let current_amount = coin_diff.map.get_mut(&coin_type);
        *current_amount = (*current_amount).sub(fr::from_u64(amount));
    } else {
        coin_diff.map.insert(coin_type, fr::from_u64(amount).negate());
    }
}

public fun final_repr(coin_diff: &CoinDiff): u256 {
    let (_, mut values) = coin_diff.map.into_keys_values();
    while (values.length() < coin_diff.total) {
        values.push_back(fr::zero());
    };
    poseidon_bn254(&values.map!(|v| v.repr()))
}
