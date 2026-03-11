// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Logic<_N extends number = 32> = number;

export type Bit = Logic<1>;

export type Uint1 = Logic<1>;
export type Uint2 = Logic<2>;
export type Uint4 = Logic<4>;
export type Uint8 = Logic<8>;
export type Uint16 = Logic<16>;
export type Uint32 = Logic<32>;
export type Uint64 = Logic<64>;

export type LogicArray<_W extends number = 8, _SIZE extends number = 0> = number[];
