
import {BigNumber, utils} from "ethers";
import {TokenUtils} from "./TokenUtils";
import {expect} from "chai";
import {ethers} from "hardhat";
import {Logger} from "tslog";
import logSettings from "../log_settings";
import {DeployerUtilsLocal} from "../scripts/deploy/DeployerUtilsLocal";
import axios from "axios";
import {IPriceCalculator, IPriceCalculator__factory} from "../typechain";

const log: Logger = new Logger(logSettings);

export class PriceCalculatorUtils {

  public static async getFormattedPrice(
    calculator: IPriceCalculator,
    token: string,
    outputToken: string
  ): Promise<number> {
    const price = +utils.formatUnits(await calculator.getPrice(token, outputToken));
    const name = await TokenUtils.tokenName(token);
    const outputName = await TokenUtils.tokenName(outputToken);
    console.log('price', name, 'against', outputName, price);
    expect(price).is.not.eq(0, name + " doesn't calculated");
    return price;
  }

  // keep this method for possible implement caches
  public static async getPriceCached(token: string, calculator: IPriceCalculator | null = null): Promise<BigNumber> {
    const net = await ethers.provider.getNetwork();
    let network = ''
    if (net.chainId === 137) {
      network = 'MATIC';
    } else if (net.chainId === 250) {
      network = 'FANTOM';
    } else if (net.chainId === 1) {
      network = '';
    } else {
      throw Error('Wrong network ' + net.chainId);
    }
    // if (network !== '') {
    //   const response = await axios.get(`https://api.tetu.io/api/v1/price/longTTL/?token=${token}&network=${network}`);
    //   log.info('price for', token, response?.data?.result);
    //   if (response?.data?.result) {
    //     return BigNumber.from(response?.data?.result);
    //   }
    // }
    if (calculator == null) {
      const tools = await DeployerUtilsLocal.getToolsAddresses();
      calculator = IPriceCalculator__factory.connect(tools.calculator, ethers.provider);
    }
    if (net.chainId === 137 || net.chainId === 250 || net.chainId === 1) {
      return calculator.getPriceWithDefaultOutput(token);
    } else {
      throw Error('No config for ' + net.chainId);
    }
  }

}
