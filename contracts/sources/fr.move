module shroud::fr;

use sui::bcs;

public struct FR has copy, drop {
    value: u256,
}

const FR_MODULUS: u256 = 0x2523648240000001BA344D8000000007FF9F800000000010A10000000000000D;
const FR_MODULUS_HALF: u256 = FR_MODULUS - 1 / 2;

public fun zero(): FR {
    FR {
        value: 0,
    }
}

public fun from_u64(value: u64): FR {
    FR {
        value: value as u256,
    }
}

public fun from_repr(repr: u256): FR {
    FR {
        value: repr % FR_MODULUS,
    }
}

public fun from_address_bytes(address: address): FR {
    let mut b = bcs::new(bcs::to_bytes(&address));
    FR {
        value: b.peel_u256() % FR_MODULUS,
    }
}

public fun from_address_string(address: address): FR {
    let mut b = bcs::new(address.to_string().into_bytes());
    FR {
        value: b.peel_u256() % FR_MODULUS,
    }
}

public fun negate(fr: FR): FR {
    FR {
        value: (FR_MODULUS - fr.value) % FR_MODULUS,
    }
}

public fun add(fr1: FR, fr2: FR): FR {
    FR {
        value: (fr1.value + fr2.value) % FR_MODULUS,
    }
}

public fun sub(fr1: FR, fr2: FR): FR {
    add(fr1, negate(fr2))
}

public fun mul(fr1: FR, fr2: FR): FR {
    FR {
        value: (fr1.value * fr2.value) % FR_MODULUS,
    }
}

public fun repr(fr: FR): u256 {
    fr.value % FR_MODULUS
}

public fun is_neg(fr: FR): bool {
    fr.value > FR_MODULUS_HALF
}
