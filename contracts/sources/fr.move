module shroud::fr;

public struct FR has copy, drop {
    is_neg: bool,
    value: u64,
}

const FR_MODULUS: u256 = 0x2523648240000001BA344D8000000007FF9F800000000010A10000000000000D;
const FR_MODULUS_HALF: u256 = FR_MODULUS - 1 / 2;

public fun zero(): FR {
    FR {
        is_neg: false,
        value: 0,
    }
}

public fun from_u64(value: u64): FR {
    FR {
        is_neg: false,
        value: value,
    }
}

public fun from_repr(repr: u256): FR {
    let is_neg = repr > FR_MODULUS_HALF;
    let value = if (is_neg) {
        (FR_MODULUS - repr) as u64
    } else {
        repr as u64
    };
    FR {
        is_neg,
        value,
    }
}

public fun negate(fr: FR): FR {
    FR {
        is_neg: !fr.is_neg,
        value: fr.value,
    }
}

public fun add(fr1: FR, fr2: FR): FR {
    let mut value = fr1.value;
    let mut is_neg = fr1.is_neg;

    if (fr1.is_neg == fr2.is_neg) {
        // Same sign, add values
        value = value + fr2.value;
    } else {
        // Different signs, subtract smaller from larger
        if (fr1.value >= fr2.value) {
            value = fr1.value - fr2.value;
            is_neg = fr1.is_neg;
        } else {
            value = fr2.value - fr1.value;
            is_neg = fr2.is_neg;
        }
    };
    FR {
        is_neg,
        value,
    }
}

public fun sub(fr1: FR, fr2: FR): FR {
    add(fr1, negate(fr2))
}

public fun mul(fr1: FR, fr2: FR): FR {
    let mut value = fr1.value * fr2.value;
    let mut is_neg = fr1.is_neg != fr2.is_neg;

    FR {
        is_neg: is_neg,
        value: value,
    }
}

public fun repr(fr: FR): u256 {
    let value = fr.value as u256;
    if (!fr.is_neg) {
        value % FR_MODULUS
    } else {
        (FR_MODULUS - value) % FR_MODULUS
    }
}
