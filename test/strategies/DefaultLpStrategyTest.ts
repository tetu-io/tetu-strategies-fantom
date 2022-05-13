import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {DeployerUtilsLocal} from "../../scripts/deploy/DeployerUtilsLocal";
import {StrategyTestUtils} from "./StrategyTestUtils";
import {IStrategy, ISmartVault} from "../../typechain";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../CoreContractsWrapper";
import {ToolsContractsWrapper} from "../ToolsContractsWrapper";
import {universalStrategyTest} from "./UniversalStrategyTest";
import {SpecificStrategyTest} from "./SpecificStrategyTest";
import {DeployInfo} from "./DeployInfo";
import {DoHardWorkLoopBase} from "./DoHardWorkLoopBase";


const {expect} = chai;
chai.use(chaiAsPromised);

async function startDefaultLpStrategyTest(
  strategyName: string,
  factoryForLiquidation: string,
  underlying: string,
  token0: string,
  token0Name: string,
  token1: string,
  token1Name: string,
  platformPoolIdentifier: string,
  deployInfo: DeployInfo,
  deposit = 100_000,
  loopValue = 300,
  advanceBlocks = true,
) {


  // **********************************************
  // ************** CONFIG*************************
  // **********************************************
  const strategyContractName = strategyName;
  const vaultName = token0Name + "_" + token1Name;
  // const underlying = token;
  // add custom liquidation path if necessary
  const forwarderConfigurator = null;
  // only for strategies where we expect PPFS fluctuations
  const ppfsDecreaseAllowed = false;
  // only for strategies where we expect PPFS fluctuations
  const balanceTolerance = 0;
  const finalBalanceTolerance = 0;
  // at least 3
  const loops = 3;
  const specificTests: SpecificStrategyTest[] = [];
  // **********************************************

  const deployer = (signer: SignerWithAddress) => {
    const core = deployInfo.core as CoreContractsWrapper;
    return StrategyTestUtils.deploy(
      signer,
      core,
      vaultName,
      vaultAddress => {
        const strategyArgs = [
          core.controller.address,
          vaultAddress,
          underlying,
          token0,
          token1,
          platformPoolIdentifier
        ];
        return DeployerUtilsLocal.deployContract(
          signer,
          strategyContractName,
          ...strategyArgs
        ) as Promise<IStrategy>;
      },
      underlying
    );
  };
  const hwInitiator = (
    _signer: SignerWithAddress,
    _user: SignerWithAddress,
    _core: CoreContractsWrapper,
    _tools: ToolsContractsWrapper,
    _underlying: string,
    _vault: ISmartVault,
    _strategy: IStrategy,
    _balanceTolerance: number
  ) => {
    return new DoHardWorkLoopBase(
      _signer,
      _user,
      _core,
      _tools,
      _underlying,
      _vault,
      _strategy,
      _balanceTolerance,
      finalBalanceTolerance,
    );
  };

  await universalStrategyTest(
    strategyName + vaultName,
    deployInfo,
    deployer,
    hwInitiator,
    forwarderConfigurator,
    ppfsDecreaseAllowed,
    balanceTolerance,
    deposit,
    loops,
    loopValue,
    advanceBlocks,
    specificTests,
  );
}

export {startDefaultLpStrategyTest};
