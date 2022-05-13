import {
  IPriceCalculator,
  IUniswapV2Factory,
  IUniswapV2Factory__factory,
  IUniswapV2Pair,
  IUniswapV2Pair__factory,
  IUniswapV2Router02,
  IUniswapV2Router02__factory
} from "../typechain";
import {BigNumber, utils} from "ethers";
import {TokenUtils} from "./TokenUtils";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import {expect} from "chai";
import {RunHelper} from "../scripts/utils/tools/RunHelper";
import {MintHelperUtils} from "./MintHelperUtils";
import {CoreContractsWrapper} from "./CoreContractsWrapper";
import {DeployerUtilsLocal} from "../scripts/deploy/DeployerUtilsLocal";
import {Misc} from "../scripts/utils/tools/Misc";
import {PriceCalculatorUtils} from "./PriceCalculatorUtils";

export class UniswapUtils {
  public static deadline = "1000000000000";

  public static async swapNETWORK_COINForExactTokens(
    signer: SignerWithAddress,
    path: string[],
    amount: string,
    routerAddress: string
  ) {
    const router = await UniswapUtils.connectRouter(routerAddress, signer);
    const networkCoinAmount = (await signer.getBalance())
      .sub(utils.parseEther("0.1"));
    console.log("networkCoinAmount", utils.formatUnits(networkCoinAmount));
    await router.swapETHForExactTokens(
      BigNumber.from(amount),
      path,
      signer.address,
      UniswapUtils.deadline,
      {value: networkCoinAmount}
    );
  }

  public static async swapExactTokensForTokens(
    sender: SignerWithAddress,
    _route: string[],
    amountToSell: string,
    _to: string,
    _router: string
  ) {
    const bal = await TokenUtils.balanceOf(_route[0], sender.address);
    const decimals = await TokenUtils.decimals(_route[0]);
    expect(+utils.formatUnits(bal, decimals)).is.greaterThanOrEqual(+utils.formatUnits(amountToSell, decimals),
      'Not enough ' + await TokenUtils.tokenSymbol(_route[0]));

    const router = await UniswapUtils.connectRouter(_router, sender);
    await TokenUtils.approve(_route[0], sender, router.address, amountToSell);
    if (UniswapUtils.isFeeToken(_route[0]) || UniswapUtils.isFeeToken(_route[1])) {
      return router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
        BigNumber.from(amountToSell),
        BigNumber.from("0"),
        _route,
        _to,
        UniswapUtils.deadline
      );
    } else {
      return router.swapExactTokensForTokens(
        BigNumber.from(amountToSell),
        BigNumber.from("0"),
        _route,
        _to,
        UniswapUtils.deadline
      );
    }

  }

  private static isFeeToken(token: string) {
    return false;
  }

  public static async addLiquidity(
    sender: SignerWithAddress,
    tokenA: string,
    tokenB: string,
    amountA: string,
    amountB: string,
    _factory: string,
    _router: string,
    wait = false
  ): Promise<string> {
    const start = Date.now();
    const t0Dec = await TokenUtils.decimals(tokenA);
    const t1Dec = await TokenUtils.decimals(tokenB);
    const name0 = await TokenUtils.tokenSymbol(tokenA);
    const name1 = await TokenUtils.tokenSymbol(tokenB);
    const bal0 = await TokenUtils.balanceOf(tokenA, sender.address);
    const bal1 = await TokenUtils.balanceOf(tokenB, sender.address);

    expect(+utils.formatUnits(bal0, t0Dec))
      .is.greaterThanOrEqual(+utils.formatUnits(amountA, t0Dec), 'not enough bal for token A ' + name0);
    expect(+utils.formatUnits(bal1, t1Dec))
      .is.greaterThanOrEqual(+utils.formatUnits(amountB, t1Dec), 'not enough bal for token B ' + name1);


    await RunHelper.runAndWait(() => TokenUtils.approve(tokenA, sender, _router, amountA), true, wait);
    await RunHelper.runAndWait(() => TokenUtils.approve(tokenB, sender, _router, amountB), true, wait);

    const router = await UniswapUtils.connectRouter(_router, sender);
    await RunHelper.runAndWait(() => router.addLiquidity(
      tokenA,
      tokenB,
      amountA,
      amountB,
      1,
      1,
      sender.address,
      UniswapUtils.deadline
    ), true, wait);


    const factory = await UniswapUtils.connectFactory(_factory, sender);
    const pairAdr = UniswapUtils.getPairFromFactory(sender, tokenA, tokenB, factory.address);
    Misc.printDuration('addLiquidity completed', start);
    return pairAdr;
  }

  public static async removeLiquidity(
    sender: SignerWithAddress,
    lpToken: string,
    tokenA: string,
    tokenB: string,
    lpTokenAmount: string,
    _router: string,
    wait = false
  ) {

    await RunHelper.runAndWait(() => TokenUtils.approve(lpToken, sender, _router, lpTokenAmount), true, wait);

    const router = await UniswapUtils.connectRouter(_router, sender);
    await RunHelper.runAndWait(() => router.removeLiquidity(
      tokenA,
      tokenB,
      lpTokenAmount,
      1,
      1,
      sender.address,
      UniswapUtils.deadline
    ), true, wait);
  }

  public static async connectRouter(router: string, signer: SignerWithAddress): Promise<IUniswapV2Router02> {
    return IUniswapV2Router02__factory.connect(router, signer);
  }

  public static async connectFactory(factory: string, signer: SignerWithAddress): Promise<IUniswapV2Factory> {
    return IUniswapV2Factory__factory.connect(factory, signer);
  }

  public static async connectLpContract(adr: string, signer: SignerWithAddress): Promise<IUniswapV2Pair> {
    return IUniswapV2Pair__factory.connect(adr, signer);
  }

  public static async getLpInfo(adr: string, signer: SignerWithAddress, targetToken: string): Promise<[number, string, number, number]> {
    const lp = await UniswapUtils.connectLpContract(adr, signer);
    const token0 = await lp.token0();
    const token1 = await lp.token1();

    const token0Decimals = await TokenUtils.decimals(token0);
    const token1Decimals = await TokenUtils.decimals(token1);

    const reserves = await lp.getReserves();
    const reserve0 = +utils.formatUnits(reserves[0], token0Decimals);
    const reserve1 = +utils.formatUnits(reserves[1], token1Decimals);

    const tokenStacked = (targetToken === token0) ? reserve0 : reserve1;
    const oppositeTokenStacked = (targetToken === token0) ? reserve1 : reserve0;
    const oppositeToken = (targetToken === token0) ? token1 : token0;


    let price;
    if (token0 === targetToken) {
      price = reserve1 / reserve0;
    } else {
      price = reserve0 / reserve1;
    }

    return [tokenStacked, oppositeToken, oppositeTokenStacked, price];
  }

  public static async createPairForRewardToken(
    signer: SignerWithAddress,
    core: CoreContractsWrapper,
    amount: string
  ) {
    const usdc = await DeployerUtilsLocal.getUSDCAddress();
    await TokenUtils.getToken(usdc, signer.address, utils.parseUnits(amount, 6))
    const rewardTokenAddress = core.rewardToken.address;

    const usdcBal = await TokenUtils.balanceOf(usdc, signer.address);
    console.log('USDC bought', usdcBal.toString());
    expect(+utils.formatUnits(usdcBal, 6)).is.greaterThanOrEqual(+amount);

    // if (core.rewardToken.address.toLowerCase() === MaticAddresses.TETU_TOKEN) {
    //   await TokenUtils.getToken(core.rewardToken.address, signer.address, utils.parseUnits(amount))
    // } else {
    await MintHelperUtils.mint(core.controller, core.announcer, (+amount * 2).toString(), signer.address);
    // }

    const tokenBal = await TokenUtils.balanceOf(rewardTokenAddress, signer.address);
    console.log('Token minted', tokenBal.toString());
    expect(+utils.formatUnits(tokenBal, 18)).is.greaterThanOrEqual(+amount);

    const factory = await DeployerUtilsLocal.getDefaultNetworkFactory();
    const lp = await UniswapUtils.addLiquidity(
      signer,
      rewardTokenAddress,
      usdc,
      utils.parseUnits(amount, 18).toString(),
      utils.parseUnits(amount, 6).toString(),
      factory,
      await DeployerUtilsLocal.getRouterByFactory(factory)
    );
    await core.feeRewardForwarder.addLargestLps([core.rewardToken.address], [lp]);
    return lp;
  }

  public static async createPairForRewardTokenWithBuy(
    signer: SignerWithAddress,
    core: CoreContractsWrapper,
    amount: string
  ) {
    const usdc = await DeployerUtilsLocal.getUSDCAddress();
    await TokenUtils.getToken(usdc, signer.address, utils.parseUnits(amount, 6))
    const rewardTokenAddress = core.rewardToken.address;

    const usdcBal = await TokenUtils.balanceOf(usdc, signer.address);
    console.log('USDC bought', usdcBal.toString());
    expect(+utils.formatUnits(usdcBal, 6)).is.greaterThanOrEqual(+amount);

    await MintHelperUtils.mint(core.controller, core.announcer, amount, signer.address);

    const tokenBal = await TokenUtils.balanceOf(rewardTokenAddress, signer.address);
    console.log('Token minted', tokenBal.toString());
    expect(+utils.formatUnits(tokenBal, 18)).is.greaterThanOrEqual(+amount);

    return UniswapUtils.addLiquidity(
      signer,
      rewardTokenAddress,
      usdc,
      utils.parseUnits(amount, 18).toString(),
      utils.parseUnits(amount, 6).toString(),
      await DeployerUtilsLocal.getDefaultNetworkFactory(),
      await DeployerUtilsLocal.getRouterByFactory(await DeployerUtilsLocal.getDefaultNetworkFactory())
    );
  }

  public static async createTetuUsdc(
    signer: SignerWithAddress,
    core: CoreContractsWrapper,
    amount: string
  ) {
    const start = Date.now();
    const usdc = await DeployerUtilsLocal.getUSDCAddress();
    const tetu = core.rewardToken.address.toLowerCase();
    await TokenUtils.getToken(usdc, signer.address, utils.parseUnits(amount, 6));
    const usdcBal = await TokenUtils.balanceOf(usdc, signer.address);
    console.log('USDC bought', usdcBal.toString());
    expect(+utils.formatUnits(usdcBal, 6)).is.greaterThanOrEqual(+amount);

    if (tetu === await DeployerUtilsLocal.getTETUAddress()) {
      await TokenUtils.getToken(tetu, signer.address, utils.parseUnits(amount));
    } else {
      await MintHelperUtils.mint(core.controller, core.announcer, amount, signer.address);
    }


    const tokenBal = await TokenUtils.balanceOf(tetu, signer.address);
    console.log('Token minted', tokenBal.toString());
    expect(+utils.formatUnits(tokenBal)).is.greaterThanOrEqual(+amount);

    const result = UniswapUtils.addLiquidity(
      signer,
      tetu,
      usdc,
      utils.parseUnits(amount).toString(),
      utils.parseUnits(amount, 6).toString(),
      await DeployerUtilsLocal.getDefaultNetworkFactory(),
      await DeployerUtilsLocal.getRouterByFactory(await DeployerUtilsLocal.getDefaultNetworkFactory())
    );
    Misc.printDuration('createTetuUsdc completed', start);
    return result;
  }

  public static async getTokenFromHolder(
    signer: SignerWithAddress,
    router: string,
    token: string,
    amountForSell: BigNumber,
    oppositeToken: string | null = null,
    wait = false
  ) {
    await TokenUtils.getToken(token, signer.address);
    // const dec = await TokenUtils.decimals(token);
    // const symbol = await TokenUtils.tokenSymbol(token);
    // const balanceBefore = +utils.formatUnits(await TokenUtils.balanceOf(token, signer.address), dec);
    // console.log('try to buy', symbol, amountForSell.toString(), 'balance', balanceBefore);
    // if (token === MaticAddresses.WMATIC_TOKEN) {
    //   return RunHelper.runAndWait(() =>
    //       TokenUtils.wrapMatic(signer, utils.formatUnits(amountForSell, 18)),
    //     true, wait);
    // } else {
    //   const oppositeTokenDec = await TokenUtils.decimals(oppositeToken);
    //   const oppositeTokenBal = +utils.formatUnits(await TokenUtils.balanceOf(oppositeToken, signer.address), oppositeTokenDec);
    //   if (oppositeTokenBal === 0) {
    //     throw Error('Need to refuel signer with ' + await TokenUtils.tokenSymbol(oppositeToken) + ' ' + oppositeTokenBal);
    //   }
    //   return RunHelper.runAndWait(() => UniswapUtils.swapExactTokensForTokens(
    //     signer,
    //     [oppositeToken, token],
    //     amountForSell.toString(),
    //     signer.address,
    //     router
    //   ), true, wait);
    // }
  }

  public static async getTokensAndAddLiq(
    signer: SignerWithAddress,
    lp: string,
    usdAmountN: number,
    calculator: IPriceCalculator
  ) {
    console.log("UniswapUtils: buyTokensAndAddLiq");
    const start = Date.now();
    const lpCtr = IUniswapV2Pair__factory.connect(lp, signer);
    const token0 = await lpCtr.token0();
    const token1 = await lpCtr.token1();
    const factory = await lpCtr.factory();
    const router = await DeployerUtilsLocal.getRouterByFactory(factory);
    const token0Und = await TokenUtils.decimals(token0);
    const token1Und = await TokenUtils.decimals(token1);

    const token0Price = await PriceCalculatorUtils.getPriceCached(token0);
    const token0PriceN = +utils.formatUnits(token0Price);
    const token1Price = await PriceCalculatorUtils.getPriceCached(token1);
    const token1PriceN = +utils.formatUnits(token1Price);

    const token0AmountN = ((usdAmountN / 2) / token0PriceN);
    const token0Amount = utils.parseUnits(token0AmountN.toFixed(token0Und), token0Und);
    const token1AmountN = ((usdAmountN / 2) / token1PriceN);
    const token1Amount = utils.parseUnits(token1AmountN.toFixed(token1Und), token1Und);

    await TokenUtils.getToken(token0, signer.address, token0Amount);
    await TokenUtils.getToken(token1, signer.address, token1Amount);

    await UniswapUtils.addLiquidity(
      signer,
      token0,
      token1,
      token0Amount.toString(),
      token1Amount.toString(),
      factory,
      router,
      false
    );
    Misc.printDuration('UniswapUtils: buyTokensAndAddLiq finished', start);
  }

  public static async wrapNetworkToken(signer: SignerWithAddress) {
    await TokenUtils.wrapNetworkToken(signer, utils.formatUnits(utils.parseUnits('10000000'))); // 10m wmatic
  }

  public static async getPairFromFactory(signer: SignerWithAddress, token0: string, token1: string, factory: string): Promise<string> {
    const factoryCtr = await UniswapUtils.connectFactory(factory, signer);
    return factoryCtr.getPair(token0, token1);
  }

  public static encodePrice(reserve0: BigNumber, reserve1: BigNumber) {
    return [reserve1.mul(BigNumber.from(2).pow(112)).div(reserve0), reserve0.mul(BigNumber.from(2).pow(112)).div(reserve1)]
  }

}
