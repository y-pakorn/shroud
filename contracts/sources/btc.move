module shroud::btc;

use sui::coin;

public struct BTC has drop {}

fun init(witness: BTC, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(
        witness,
        6,
        b"BTC",
        b"",
        b"",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury, ctx.sender());
}
