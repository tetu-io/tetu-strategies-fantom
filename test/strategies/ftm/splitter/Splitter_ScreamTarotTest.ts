import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {readFileSync} from "fs";
import {config as dotEnvConfig} from "dotenv";
import {DeployInfo} from "../../DeployInfo";
import {DeployerUtilsLocal} from "../../../../scripts/deploy/DeployerUtilsLocal";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {CoreContractsWrapper} from "../../../CoreContractsWrapper";
import {IStrategy, IStrategy__factory, ISmartVault} from "../../../../typechain";
import {ToolsContractsWrapper} from "../../../ToolsContractsWrapper";
import {universalStrategyTest} from "../../UniversalStrategyTest";
import {SpecificStrategyTest} from "../../SpecificStrategyTest";
import {SplitterDoHardWork} from "../../SplitterDoHardWork";
import {UniswapUtils} from "../../../UniswapUtils";

dotEnvConfig();
// tslint:disable-next-line:no-var-requires
const argv = require('yargs/yargs')()
  .env('TETU')
  .options({
    disableStrategyTests: {
      type: "boolean",
      default: false,
    },
    onlyOneSplitterScreamTarotStrategyTest: {
      type: "number",
      default: 3,
    },
    deployCoreContracts: {
      type: "boolean",
      default: false,
    },
    hardhatChainId: {
      type: "number",
      default: 137
    },
  }).argv;

const {expect} = chai;
chai.use(chaiAsPromised);

describe('Splitter with Scream /Tarot tests', async () => {

  if (argv.disableStrategyTests || argv.hardhatChainId !== 250) {
    return;
  }
  const infos = readFileSync('scripts/utils/download/data/scream_markets.csv', 'utf8').split(/\r?\n/);

  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, argv.deployCoreContracts);
  });

  infos.forEach(screamInfo => {
    const screamStart = screamInfo.split(',');
    const idx = screamStart[0];
    const tokenName = screamStart[4];
    const token = screamStart[3];

    if (!idx || idx === 'idx') {
      console.log('skip ', tokenName);
      return;
    }
    console.log('Start test strategy', screamStart);

    if (argv.onlyOneSplitterScreamTarotStrategyTest !== -1 && parseFloat(idx) !== argv.onlyOneSplitterScreamTarotStrategyTest) {
      return;
    }
    // **********************************************
    // ************** CONFIG*************************
    // **********************************************
    const underlying = token;
    // add custom liquidation path if necessary
    const forwarderConfigurator = null;
    // only for strategies where we expect PPFS fluctuations
    const ppfsDecreaseAllowed = true;
    // only for strategies where we expect PPFS fluctuations
    const balanceTolerance = 0.001;
    const finalBalanceTolerance = 0.0001;
    const deposit = 100_000;
    // at least 3
    const loops = 5;
    // number of blocks or timestamp value
    const loopValue = 30000;
    // use 'true' if farmable platform values depends on blocks, instead you can use timestamp
    const advanceBlocks = true;
    const specificTests: SpecificStrategyTest[] = [];
    // **********************************************

    const deployer = (signer: SignerWithAddress) => {
      const core = deployInfo.core as CoreContractsWrapper;
      return StrategyTestUtils.deploy(
        signer,
        core,
        tokenName,
        async vaultAddress => {
          const rewardTokenLp = await UniswapUtils.createTetuUsdc(
            signer, core, "1000000"
          );
          await core.feeRewardForwarder.addLargestLps([core.rewardToken.address], [rewardTokenLp]);

          const splitter = await DeployerUtilsLocal.deployStrategySplitter(signer);
          await splitter.initialize(
            core.controller.address,
            underlying,
            vaultAddress,
          );

          // *** INIT FIRST SPLITTER ***
          const aave = await deployScream(signer, screamStart, core.controller.address, splitter.address);
          const tarots = await DeployerUtilsLocal.deployImpermaxLikeStrategies(
            signer,
            core.controller.address,
            splitter.address,
            underlying,
            'StrategyTarot',
            'scripts/utils/download/data/tarot.csv',
            1_000_000
          );
          if (tarots.length === 0) {
            throw new Error('NO TAROTS');
          }
          const strats: string[] = [aave, ...tarots];

          const tarotsRatios = [];
          let tarotsRatiosSum = 0;

          await core.controller.addStrategiesToSplitter(splitter.address, strats);
          for (const tarot of tarots) {
            tarotsRatios.push(1);
            tarotsRatiosSum++;
          }

          await splitter.setStrategyRatios(
            strats,
            [100 - tarotsRatiosSum, ...tarotsRatios]
          );

          return IStrategy__factory.connect(splitter.address, signer);
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
      return new SplitterDoHardWork(
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

    universalStrategyTest(
      'SplitterScreamTarot_' + tokenName,
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
  });
});


async function deployScream(
  signer: SignerWithAddress,
  info: string[],
  controller: string,
  vaultAddress: string
) {
  const scTokenAddress = info[2];
  const token = info[3];
  const collateralFactor = info[5];
  const borrowTarget = info[6];

  const strategyArgs = [
    controller,
    vaultAddress,
    token,
    scTokenAddress,
    borrowTarget,
    collateralFactor
  ];
  const strat = await DeployerUtilsLocal.deployContract(
    signer,
    'StrategyScreamFold',
    ...strategyArgs
  ) as IStrategy;
  return strat.address;
}
