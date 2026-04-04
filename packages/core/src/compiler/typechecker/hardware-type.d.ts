export declare enum HardwareTypeKind {
    Wire = "Wire",
    Register = "Register",
    WireArray = "WireArray",
    RegisterArray = "RegisterArray"
}
export interface HardwareType {
    readonly type_kind: HardwareTypeKind;
    readonly bit_width: number;
    readonly is_signed: boolean;
    readonly array_size?: number;
}
export declare const HARDWARE_TYPE_NUMBER: HardwareType;
export declare const HARDWARE_TYPE_BOOLEAN: HardwareType;
export declare function makeArrayType(element_type: HardwareType, array_size: number): HardwareType;
export declare function makeWireType(bit_width: number, is_signed: boolean): HardwareType;
export declare function resolveBinaryResultType(left: HardwareType, right: HardwareType, operator: string): HardwareType;
