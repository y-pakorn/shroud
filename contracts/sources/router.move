module shroud::router;

use shroud::hasui::HASUI;
use shroud::suins::SUINS;
use shroud::usdc::USDC;
use shroud::usdt::USDT;
use shroud::wal::WAL;
use std::type_name;
use sui::bag::{Self, Bag};
use sui::coin::{TreasuryCap, Coin};

public struct Router has key, store {
    id: UID,
    bag: Bag,
}

public fun create_router(
    usdc_cap: TreasuryCap<USDC>,
    usdt_cap: TreasuryCap<USDT>,
    hasui_cap: TreasuryCap<HASUI>,
    suins_cap: TreasuryCap<SUINS>,
    wal_cap: TreasuryCap<WAL>,
    ctx: &mut TxContext,
) {
    let mut bag = bag::new(ctx);
    bag.add(type_name::get<USDC>(), usdc_cap);
    bag.add(type_name::get<USDT>(), usdt_cap);
    bag.add(type_name::get<HASUI>(), hasui_cap);
    bag.add(type_name::get<SUINS>(), suins_cap);
    bag.add(type_name::get<WAL>(), wal_cap);
    let router = Router {
        id: object::new(ctx),
        bag,
    };
    transfer::share_object(router);
}

public fun swap<O, T>(
    router: &mut Router,
    in_coin: Coin<O>,
    minimum_received_amount: u64,
    ctx: &mut TxContext,
): Coin<T> {
    let in_cap: &mut TreasuryCap<O> = router.bag.borrow_mut(type_name::get<O>());
    in_cap.burn(in_coin);

    let out_cap: &mut TreasuryCap<T> = router.bag.borrow_mut(type_name::get<T>());
    let out_coin = out_cap.mint(minimum_received_amount, ctx);
    out_coin
}

public fun mint<T>(router: &mut Router, amount: u64, ctx: &mut TxContext): Coin<T> {
    let out_cap: &mut TreasuryCap<T> = router.bag.borrow_mut(type_name::get<T>());
    out_cap.mint(amount, ctx)
}

public fun burn<T>(router: &mut Router, coin: Coin<T>) {
    let out_cap: &mut TreasuryCap<T> = router.bag.borrow_mut(type_name::get<T>());
    out_cap.burn(coin);
}
