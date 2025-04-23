module shroud::eth;

use sui::coin;

public struct ETH has drop {}

fun init(witness: ETH, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(
        witness,
        6,
        b"ETH",
        b"",
        b"",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury, ctx.sender());
}
