import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {readFileSync} from "fs";
import {config as dotEnvConfig} from "dotenv";
import {FtmAddresses} from "../../../../scripts/addresses/FtmAddresses";
import {DeployInfo} from "../../DeployInfo";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {IFeeRewardForwarder, IStrategy, ISmartVault} from "../../../../typechain";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";

dotEnvConfig();
// tslint:disable-next-line:no-var-requires
const argv = require('yargs/yargs')()
  .env('TETU')
  .options({
    disableStrategyTests: {
      type: "boolean",
      default: false,
    },
    onlyOneBeethovenStrategyTest: {
      type: "number",
      default: 1,
    },
    hardhatChainId: {
      type: "number",
      default: 137
    },
  }).argv;

chai.use(chaiAsPromised);

describe.skip('Universal Beethoven tests', async () => {
  if (argv.disableStrategyTests || argv.hardhatChainId !== 250) {
    return;
  }
  const infos = readFileSync('scripts/utils/download/data/beethoven_pools_10kk_tvl.csv', 'utf8').split(/\r?\n/);

  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, argv.deployCoreContracts);
  });

  infos.forEach(info => {

    const strat = info.split(',');

    const idx = strat[0];
    const lpName = strat[1];
    const lpAddress = strat[2];
    const depositToken = strat[3];
    const beethovenPoolId = strat[4];
    const rewardToDepositPoolId = strat[5];

    if (idx === 'idx') {
      console.log('skip', idx);
      return;
    }
    if (argv.onlyOneBeethovenStrategyTest !== -1 && +strat[0] !== argv.onlyOneBeethovenStrategyTest) {
      return;
    }

    // **********************************************
    // ************** CONFIG*************************
    // **********************************************
    let strategyContractName = "StrategyBeethoven";
    if (idx === "22"){
      strategyContractName = "StrategyBeethovenFD";
    }
    const vaultName = "Beets" + "_" + lpName;
    const underlying = lpAddress;
    // add custom liquidation path if necessary
    const forwarderConfigurator = async (forwarder: IFeeRewardForwarder) => {
      await forwarder.addLargestLps(
        [FtmAddresses.BEETS_TOKEN],
        ["0x648a7452DA25B4fB4BDB79bADf374a8f8a5ea2b5"]
      );
    };

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
            underlying,
            vaultAddress,
            idx,
            depositToken,
            beethovenPoolId,
            rewardToDepositPoolId
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
    console.log('strat', idx, lpName);
    /* tslint:disable:no-floating-promises */
    universalStrategyTest(
      strategyContractName + '_' + vaultName,
      deployInfo,
      deployer,
      hwInitiator,
      forwarderConfigurator,
      ppfsDecreaseAllowed,
      balanceTolerance,
      100_000,
      loops,
      60 * 60 * 24,
      false,
      specificTests,
    );
  });
});
