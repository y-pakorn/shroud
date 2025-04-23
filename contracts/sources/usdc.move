module shroud::usdc;

use sui::coin;

public struct USDC has drop {}

fun init(witness: USDC, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(
        witness,
        6,
        b"USDC",
        b"",
        b"",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury, ctx.sender());
}
