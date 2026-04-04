import { ExpressionNode } from './ast';
import { TokenReader } from './token-reader';
export declare class ExpressionParser extends TokenReader {
    protected parseExpression(): ExpressionNode;
    private parseAssignment;
    private parseBitwiseOr;
    private parseBitwiseXor;
    private parseBitwiseAnd;
    private parseEquality;
    private parseComparison;
    private parseShift;
    private parseAdditive;
    private parseMultiplicative;
    private parseUnary;
    private parsePrimary;
    private parseBitsIntrinsic;
    private wrapArrayAccess;
    private parseArrayLiteral;
    private makeBinary;
}
