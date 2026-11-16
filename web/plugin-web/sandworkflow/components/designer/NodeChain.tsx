import type { FlowNode } from '../../api/types';
import { NODE_TYPE } from '../../api/types';
import { nodeKeyOf } from '../../model/nodeTypes';
import type { CanvasHandlers } from './canvasHandlers';
import { GatewayBranches } from './GatewayBranches';
import { NodeCard } from './NodeCard';
import { NodeInsertButton } from './NodeInsertButton';

export interface NodeChainProps extends CanvasHandlers {
  node: FlowNode | null | undefined;
}

const CONNECTOR_STYLE = { width: 1, height: 16, backgroundColor: 'var(--semi-color-border)' };

/**
 * 竖向节点链：沿 childNode 递归渲染「卡片 → 连线 → + → 连线 → 后继」。
 * 排他网关在卡片下展开分支容器，再继续主链。分支列内部复用本组件
 * 渲染各自的 childNode 链。
 */
export function NodeChain({ node, ...handlers }: NodeChainProps) {
  if (!node) {
    return null;
  }
  const key = nodeKeyOf(node);
  const { onInsert } = handlers;
  return (
    <div className="flex flex-col items-center">
      {node.type === NODE_TYPE.EXCLUSIVE_GATEWAY ? (
        <>
          <NodeCard
            node={node}
            selected={handlers.selectedKey === key}
            onSelect={handlers.onSelect}
            onRemove={handlers.onRemove}
          />
          <div style={CONNECTOR_STYLE} />
          <GatewayBranches gateway={node} {...handlers} />
        </>
      ) : (
        <NodeCard
          node={node}
          selected={handlers.selectedKey === key}
          onSelect={handlers.onSelect}
          onRemove={handlers.onRemove}
        />
      )}
      <div style={CONNECTOR_STYLE} />
      <NodeInsertButton onInsert={(type) => onInsert(key, type)} />
      <div style={CONNECTOR_STYLE} />
      <NodeChain node={node.childNode} {...handlers} />
    </div>
  );
}
