import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {StrategyTestUtils} from "../../StrategyTestUtils";
import {config as dotEnvConfig} from "dotenv";
import {DeployInfo} from "../../DeployInfo";
import {FtmAddresses} from "../../../../scripts/addresses/FtmAddresses";
import {startCurveStratTest} from "./utils/UniversalCurveStrategyTest";

dotEnvConfig();
// tslint:disable-next-line:no-var-requires
const argv = require('yargs/yargs')()
  .env('TETU')
  .options({
    disableStrategyTests: {
      type: "boolean",
      default: false,
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


chai.use(chaiAsPromised);


describe.skip('Curve 2pool tests', async () => {
  if (argv.disableStrategyTests || argv.hardhatChainId !== 250) {
    return;
  }
  const underlying = FtmAddresses._2poolCrv_TOKEN;
  const strategyName = 'Curve2PoolStrategy';
  const tokenName = '2poolCrv';

  const deployInfo: DeployInfo = new DeployInfo();
  before(async function () {
    await StrategyTestUtils.deployCoreAndInit(deployInfo, argv.deployCoreContracts);
  });

  await startCurveStratTest(
    strategyName,
    underlying,
    tokenName,
    deployInfo,
    1_000_000
  );
});
