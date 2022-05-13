import {CoreAddresses} from "./scripts/models/CoreAddresses";
import {ToolsAddresses} from "./scripts/models/ToolsAddresses";
import {FtmCoreAddresses} from "./addresses_core_ftm";
import {FtmToolsAddresses} from "./addresses_tools_ftm";

export class Addresses {

  public static CORE = new Map<string, CoreAddresses>([
    ['250', FtmCoreAddresses.ADDRESSES],
  ]);

  public static TOOLS = new Map<string, ToolsAddresses>([
    ['250', FtmToolsAddresses.ADDRESSES],
  ]);

  public static TOKENS = new Map<string, Map<string, string>>([

    ['250', new Map([
      ['usdc', '0x04068da6c83afcfa0e13ba15a6696662335d5b75'],
    ])],

  ]);

  public static ORACLE = '0xb8c898e946a1e82f244c7fcaa1f6bd4de028d559';
}
