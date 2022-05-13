import {ethers} from "hardhat";
import {
  IBorrowable__factory,
  IFactory__factory,
  IPoolToken__factory,
  IVaultToken__factory,
  ISmartVault, IPriceCalculator__factory,
} from "../../../typechain";
import {mkdir, writeFileSync} from "fs";
import {FtmAddresses} from "../../addresses/FtmAddresses";
import {VaultUtils} from "../../../test/VaultUtils";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {utils} from "ethers";
import {TokenUtils} from "../../../test/TokenUtils";
import {DeployerUtilsLocal} from "../../deploy/DeployerUtilsLocal";


async function main() {
  const signer = (await ethers.getSigners())[0];
  const core = await DeployerUtilsLocal.getCoreAddresses();
  const tools = await DeployerUtilsLocal.getToolsAddresses();
  const factory = IFactory__factory.connect(FtmAddresses.TAROT_FACTORY, signer);

  const tokensLength = (await factory.allLendingPoolsLength()).toNumber();
  console.log('Lending tokens', tokensLength);


  const vaultInfos = await VaultUtils.getVaultInfoFromServer();
  const underlyingStatuses = new Map<string, boolean>();
  const currentRewards = new Map<string, number>();
  const underlyingToVault = new Map<string, string>();
  for (const vInfo of vaultInfos) {
    if (vInfo.platform !== '26') {
      continue;
    }
    underlyingStatuses.set(vInfo.underlying.toLowerCase(), vInfo.active);
    underlyingToVault.set(vInfo.underlying.toLowerCase(), vInfo.addr);
    if (vInfo.active) {
      // const vctr = await DeployerUtils.connectInterface(signer, 'SmartVault', vInfo.addr) as ISmartVault;
      // currentRewards.set(vInfo.underlying.toLowerCase(), await VaultUtils.vaultRewardsAmount(vctr, core.rewardToken));
    }
  }
  console.log('loaded vaults', underlyingStatuses.size);


  let infos: string = 'idx,lp,name,token_adr,pool_adr,tvl,borrow,utilization\n';
  for (let i = 0; i < tokensLength; i++) {
    console.log('id', i);

    const lp = await factory.allLendingPools(i);
    // if (await isVault(lp, signer)) {
    //   continue;
    // }
    const poolInfo = await factory.getLendingPool(lp)
    // console.log('pool', lp, poolInfo);
    const data0 = i + ',' + lp + ',' + await collect(poolInfo.borrowable0, signer)
    console.log(data0);
    infos += data0 + '\n';

    const data1 = i + ',' + lp + ',' + await collect(poolInfo.borrowable1, signer)
    console.log(data1);
    infos += data1 + '\n';
  }

  mkdir('./tmp/download', {recursive: true}, (err) => {
    if (err) throw err;
  });

  // console.log('data', data);
  writeFileSync('./tmp/download/tarot.csv', infos, 'utf8');
  console.log('done');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

async function collect(pool: string, signer: SignerWithAddress) {
  const tools = await DeployerUtilsLocal.getToolsAddresses();
  const calculator = IPriceCalculator__factory.connect(tools.calculator, signer);

  const underlying = await poolUnderlying(pool, signer);
  const dec = await TokenUtils.decimals(underlying);
  const underlyingName = await TokenUtils.tokenSymbol(underlying);
  const price = +utils.formatUnits(await calculator.getPriceWithDefaultOutput(underlying));
  const tvl = await poolTvl(pool, dec, signer) * price;
  const borrowed = await poolBorrowed(pool, dec, signer) * price;
  const utilisation = ((borrowed / tvl) * 100).toFixed(2);
  return underlyingName + ','
    + underlying + ','
    + pool + ','
    + tvl.toFixed(0) + ','
    + borrowed.toFixed(0) + ','
    + utilisation
}

async function poolTvl(adr: string, dec: number, signer: SignerWithAddress) {
  const pool = IBorrowable__factory.connect(adr, signer);
  const rate = +utils.formatUnits(await pool.callStatic.exchangeRate());
  const totalSupply = +utils.formatUnits(await pool.totalSupply(), dec);
  return rate * totalSupply;
}

async function poolBorrowed(adr: string, dec: number, signer: SignerWithAddress) {
  const pool = IBorrowable__factory.connect(adr, signer);
  const rate = +utils.formatUnits(await pool.callStatic.exchangeRate());
  const amount = +utils.formatUnits(await pool.totalBorrows(), dec);
  return rate * amount;
}

async function poolUnderlying(adr: string, signer: SignerWithAddress) {
  const pool = IPoolToken__factory.connect(adr, signer);
  return pool.underlying();
}

async function isVault(adr: string, signer: SignerWithAddress) {
  try {
    return await IVaultToken__factory.connect(adr, signer).isVaultToken();
  } catch {
    return false;
  }
}
