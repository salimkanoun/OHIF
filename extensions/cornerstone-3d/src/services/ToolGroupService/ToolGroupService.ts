import { ToolGroupManager, Enums, Types } from '@cornerstonejs/tools';

import { pubSubServiceInterface } from '@ohif/core';

import Cornerstone3DViewportService from '../ViewportService/Cornerstone3DViewportService';

const EVENTS = {
  VIEWPORT_ADDED: 'event::cornerstone-3d::toolgroupservice:viewportadded',
};

type Tool = {
  toolName: string;
  bindings?: typeof Enums.MouseBindings | Enums.KeyboardBindings;
};

type Tools = {
  active: Tool[];
  passive?: Tool[];
  enabled?: Tool[];
  disabled?: Tool[];
};

export default class ToolGroupService {
  serviceManager: any;
  private toolGroupIds: Set<string> = new Set();
  /**
   * Service-specific
   */
  listeners: { [key: string]: Function[] };
  EVENTS: { [key: string]: string };

  constructor(serviceManager) {
    this.serviceManager = serviceManager;
    this.listeners = {};
    this.EVENTS = EVENTS;
    Object.assign(this, pubSubServiceInterface);
  }

  /**
   * Returns the cornerstone ToolGroup for a given toolGroup UID
   * @param {string} toolGroupId - The toolGroup uid
   * @returns {IToolGroup} - The toolGroup
   */
  public getToolGroup(toolGroupId: string): Types.IToolGroup | void {
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    return toolGroup;
  }

  public getToolGroupIds(): string[] {
    return Array.from(this.toolGroupIds);
  }

  public getToolGroupForViewport(viewportId: string): Types.IToolGroup | void {
    const renderingEngine = Cornerstone3DViewportService.getRenderingEngine();
    return ToolGroupManager.getToolGroupForViewport(
      viewportId,
      renderingEngine.id
    );
  }

  public getActiveToolForViewport(viewportId: string): string {
    const toolGroup = ToolGroupManager.getToolGroupForViewport(viewportId);
    if (!toolGroup) {
      return null;
    }

    return toolGroup.getActivePrimaryMouseButtonTool();
  }

  public destroy() {
    ToolGroupManager.destroy();
    this.toolGroupIds = new Set();
  }

  public disable(viewportId: string, renderingEngineId: string): void {
    const toolGroup = ToolGroupManager.getToolGroupForViewport(
      viewportId,
      renderingEngineId
    );

    if (!toolGroup) {
      return;
    }

    toolGroup.removeViewports(renderingEngineId, viewportId);

    const viewportIds = toolGroup.getViewportIds();
    if (viewportIds.length === 0) {
      ToolGroupManager.destroyToolGroup(toolGroup.id);
    }
  }

  public addToolGroupViewport(
    viewportId: string,
    renderingEngineId: string,
    toolGroupId?: string
  ): void {
    if (!toolGroupId) {
      // If toolGroupId is not provided, add the viewport to all toolGroups
      const toolGroups = ToolGroupManager.getAllToolGroups();
      toolGroups.forEach(toolGroup => {
        toolGroup.addViewport(viewportId, renderingEngineId);
      });
    } else {
      let toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
      if (!toolGroup) {
        toolGroup = this.createToolGroup(toolGroupId);
      }

      toolGroup.addViewport(viewportId, renderingEngineId);
    }

    this._broadcastEvent(EVENTS.VIEWPORT_ADDED, { viewportId });
  }

  public createToolGroup(toolGroupId: string): Types.IToolGroup {
    if (this.getToolGroup(toolGroupId)) {
      throw new Error(`ToolGroup ${toolGroupId} already exists`);
    }

    // if the toolGroup doesn't exist, create it
    const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
    this.toolGroupIds.add(toolGroupId);

    return toolGroup;
  }

  public addToolsToToolGroup(
    toolGroupId: string,
    tools: Array<Tool>,
    configs: any = {}
  ): void {
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    // this.changeConfigurationIfNecessary(toolGroup, volumeId);
    this._addTools(toolGroup, tools, configs);
    this._setToolsMode(toolGroup, tools);
  }

  public createToolGroupAndAddTools(
    toolGroupId: string,
    tools: Array<Tool>,
    configs: any = {}
  ): Types.IToolGroup {
    const toolGroup = this.createToolGroup(toolGroupId);
    this.addToolsToToolGroup(toolGroupId, tools, configs);
    return toolGroup;
  }

  /**
  private changeConfigurationIfNecessary(toolGroup, volumeUID) {
    // handle specific assignment for volumeUID (e.g., fusion)
    const toolInstances = toolGroup._toolInstances;
    // Object.values(toolInstances).forEach(toolInstance => {
    //   if (toolInstance.configuration) {
    //     toolInstance.configuration.volumeUID = volumeUID;
    //   }
    // });
  }
   */

  private _getToolNames(toolGroupTools: Tools): string[] {
    const toolNames = [];
    toolGroupTools.active.forEach(tool => {
      toolNames.push(tool.toolName);
    });
    if (toolGroupTools.passive) {
      toolGroupTools.passive.forEach(tool => {
        toolNames.push(tool.toolName);
      });
    }

    if (toolGroupTools.enabled) {
      toolGroupTools.enabled.forEach(tool => {
        toolNames.push(tool.toolName);
      });
    }

    return toolNames;
  }

  private _setToolsMode(toolGroup, tools) {
    const { active, passive, enabled, disabled } = tools;
    active.forEach(({ toolName, bindings }) => {
      toolGroup.setToolActive(toolName, { bindings });
    });

    if (passive) {
      passive.forEach(({ toolName }) => {
        toolGroup.setToolPassive(toolName);
      });
    }

    if (enabled) {
      enabled.forEach(({ toolName }) => {
        toolGroup.setToolEnabled(toolName);
      });
    }

    if (disabled) {
      disabled.forEach(({ toolName }) => {
        toolGroup.setToolDisabled(toolName);
      });
    }
  }

  private _addTools(toolGroup, tools, configs) {
    const toolNames = this._getToolNames(tools);
    toolNames.forEach(toolName => {
      // Initialize the toolConfig if no configuration is provided
      const toolConfig = configs[toolName] ?? {};

      // if (volumeUID) {
      //   toolConfig.volumeUID = volumeUID;
      // }

      toolGroup.addTool(toolName, { ...toolConfig });
    });
  }
}