module shroud::fr;

public struct FR has copy, drop {
    value: u256,
}

const FR_MODULUS: u256 =
    21888242871839275222246405745257275088548364400416034343698204186575808495617;
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
    FR {
        value: address.to_u256() % FR_MODULUS,
    }
}

public fun negate(fr: FR): FR {
    FR {
        value: (FR_MODULUS - fr.value) % FR_MODULUS,
    }
}

public fun add(fr1: FR, fr2: FR): FR {
    let a = fr1.value;
    let b = fr2.value;
    let m = FR_MODULUS;

    // Safe addition with overflow check
    let sum = if (a > m - b) {
        // If a + b would overflow, compute (a - (m - b)) % m
        (a - (m - b)) % m
    } else {
        // Otherwise just add and take modulo
        (a + b) % m
    };

    FR {
        value: sum,
    }
}

public fun sub(fr1: FR, fr2: FR): FR {
    add(fr1, negate(fr2))
}

public fun mul(fr1: FR, fr2: FR): FR {
    // Montgomery multiplication implementation
    let mut a = fr1.value;
    let mut b = fr2.value;
    let m = FR_MODULUS;

    // Initialize result
    let mut r: u256 = 0;

    // Perform Montgomery multiplication
    while (b > 0) {
        if (b & 1 == 1) {
            r = (r + a) % m;
        };
        a = (a << 1) % m;
        b = b >> 1;
    };
    FR {
        value: r,
    }
}

public fun pow5(fr: FR): FR {
    let fr2 = mul(fr, fr);
    let fr4 = mul(fr2, fr2);
    mul(fr, fr4)
}

public fun repr(fr: FR): u256 {
    fr.value % FR_MODULUS
}

public fun is_neg(fr: FR): bool {
    fr.value > FR_MODULUS_HALF
}

public fun from_u256(value: u256): FR {
    FR {
        value: value % FR_MODULUS,
    }
}

public fun to_u256(fr: FR): u256 {
    fr.value
}

public fun pow(fr: FR, exp: u64): FR {
    let mut result = FR { value: 1 };
    let mut base = fr;
    let mut e = exp;

    while (e > 0) {
        if (e & 1 == 1) {
            result = mul(result, base);
        };
        base = mul(base, base);
        e = e >> 1;
    };
    result
}
