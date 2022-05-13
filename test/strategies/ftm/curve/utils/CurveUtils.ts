import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {BigNumber, utils} from "ethers";
import {
  IAavePool,
  ICurve2Pool__factory,
  IERC20__factory,
  IRenBTCFtmPool__factory,
  ITricryptoPoolFtm__factory
} from "../../../../../typechain";
import {ethers} from "hardhat";
import {expect} from "chai";
import {TokenUtils} from "../../../../TokenUtils";
import {FtmAddresses} from "../../../../../scripts/addresses/FtmAddresses";

export class CurveUtils {

  public static async isCurve(signer: SignerWithAddress, token: string) {
    const name = await TokenUtils.tokenName(token);
    return name.startsWith('Curve');
  }

  public static async swapTokens(trader: SignerWithAddress, token: string) {
    token = token.toLowerCase();
    if (token === FtmAddresses.USD_BTC_ETH_CRV_TOKEN) {
      await CurveUtils.swapTricryptoFantom(trader);
    } else if (token === FtmAddresses.g3CRV_TOKEN) {
      await CurveUtils.swapTokensGEIST(trader);
    } else if (token === FtmAddresses._2poolCrv_TOKEN) {
      await CurveUtils.swapTokens2poolFtm(trader);
    } else if (token === FtmAddresses.renCRV_TOKEN) {
      await CurveUtils.swapRenFtm(trader);
    } else {
      throw new Error('unknown token ' + token);
    }
  }


  public static async swapTokensGEIST(trader: SignerWithAddress) {
    const amount = utils.parseUnits('10000', 6);
    await TokenUtils.getToken(FtmAddresses.USDC_TOKEN, trader.address, amount);

    const usdcToken = IERC20__factory.connect(FtmAddresses.USDC_TOKEN, trader);
    const usdcUserBalance = await usdcToken.balanceOf(trader.address);
    expect(usdcUserBalance).is.not.eq("0", "user should have some USDC tokens to swap");
    const depContract = await ethers.getContractAt("IAavePool", FtmAddresses.CURVE_geist_POOL, trader) as IAavePool;
    await usdcToken.approve(FtmAddresses.CURVE_geist_POOL, usdcUserBalance);
    // swap usdc to dai
    await depContract.exchange_underlying(1, 0, usdcUserBalance, BigNumber.from("0"));
  }

  public static async swapTokens2poolFtm(signer: SignerWithAddress) {
    console.log('swap 2pool')
    const token = FtmAddresses.USDC_TOKEN;
    const dec = await TokenUtils.decimals(token);
    await TokenUtils.getToken(token, signer.address, utils.parseUnits('10000', dec));
    const pool = ICurve2Pool__factory.connect(FtmAddresses.CURVE_2_POOL, signer);
    await TokenUtils.approve(token, signer, pool.address, utils.parseUnits('10000', dec).mul(2).toString());
    await pool.exchange(1, 0, utils.parseUnits('10000', dec), 0);
    console.log('swap 2pool completed')
  }

  public static async swapTricryptoFantom(signer: SignerWithAddress) {
    console.log('swap tricrypto ftm')
    const token = FtmAddresses.fUSDT_TOKEN;
    const dec = await TokenUtils.decimals(token);
    await TokenUtils.getToken(token, signer.address, utils.parseUnits('10000', dec));
    const pool = ITricryptoPoolFtm__factory.connect(FtmAddresses.CURVE_tricrypto_POOL, signer);
    await TokenUtils.approve(token, signer, pool.address, utils.parseUnits('10000', dec).mul(2).toString());
    await pool.exchange(0, 1, utils.parseUnits('10000', dec), 0, false);
    console.log('swap tricrypto ftm completed')
  }

  public static async swapRenFtm(signer: SignerWithAddress) {
    console.log('swap ren ftm')
    const amount = utils.parseUnits('1', 8);
    await TokenUtils.getToken(FtmAddresses.WBTC_TOKEN, signer.address, amount);
    const pool = IRenBTCFtmPool__factory.connect(FtmAddresses.CURVE_ren_POOL, signer);
    await TokenUtils.approve(FtmAddresses.WBTC_TOKEN, signer, pool.address, amount.mul(2).toString());
    await pool.exchange(0, 1, amount, 0);
    console.log('swap ren ftm completed')
  }
}
