import { ExpressionNode } from '../parser/ast';
import { HardwareType } from './hardware-type';
import { TypeEnvironment } from './type-environment';
export declare const TYPE_MAP: WeakMap<ExpressionNode, HardwareType>;
export declare function checkExpression(expression: ExpressionNode, environment: TypeEnvironment): HardwareType;
