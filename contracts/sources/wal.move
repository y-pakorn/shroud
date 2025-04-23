module shroud::wal;

use sui::coin;

public struct WAL has drop {}

fun init(witness: WAL, ctx: &mut TxContext) {
    let (treasury, metadata) = coin::create_currency(
        witness,
        6,
        b"WAL",
        b"",
        b"",
        option::none(),
        ctx,
    );
    transfer::public_freeze_object(metadata);
    transfer::public_transfer(treasury, ctx.sender());
}
