export interface BoardDefinition {
    /** Board identifier used as the constraint filename stem (e.g. "tang_nano_9k" -> "tang_nano_9k.cst"). */
    id?: string;
    vendor: 'gowin' | 'xilinx' | 'intel' | 'lattice';
    family: string;
    part: string;
    clocks: Record<string, {
        pin: string;
        freq: string;
        std: string;
    }>;
    io: Record<string, {
        pin: string;
        std: string;
        drive?: string;
        pull?: string;
    }>;
}
export interface ConstraintOutput {
    filename: string;
    content: string;
}
export declare function generateConstraints(board: BoardDefinition): ConstraintOutput;
