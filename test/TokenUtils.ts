import {ethers} from "hardhat";
import {ERC20__factory, IERC721Enumerable__factory, IWmatic, IWmatic__factory} from "../typechain";
import {BigNumber, utils} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {DeployerUtilsLocal} from "../scripts/deploy/DeployerUtilsLocal";
import {Misc} from "../scripts/utils/tools/Misc";
import {parseUnits} from "ethers/lib/utils";
import {FtmAddresses} from "../scripts/addresses/FtmAddresses";

const {expect} = chai;
chai.use(chaiAsPromised);

export class TokenUtils {

  // use the most neutral place, some contracts (like swap pairs) can be used in tests and direct transfer ruin internal logic
  public static TOKEN_HOLDERS = new Map<string, string>([
    [FtmAddresses.USDC_TOKEN, '0xe578c856933d8e1082740bf7661e379aa2a30b26'.toLowerCase()], // geist
    [FtmAddresses.fUSDT_TOKEN, '0x940f41f0ec9ba1a34cf001cc03347ac092f5f6b5'.toLowerCase()], // geist
    [FtmAddresses.WFTM_TOKEN, '0x39b3bd37208cbade74d0fcbdbb12d606295b430a'.toLowerCase()], // geist
    [FtmAddresses.WBTC_TOKEN, '0x38aca5484b8603373acc6961ecd57a6a594510a3'.toLowerCase()], // geist
    [FtmAddresses.CRV_TOKEN, '0xd4F94D0aaa640BBb72b5EEc2D85F6D114D81a88E'.toLowerCase()], // geist
    [FtmAddresses.YFI_TOKEN, '0x0845c0bfe75691b1e21b24351aac581a7fb6b7df'.toLowerCase()], // yearn
    [FtmAddresses.FUSD_TOKEN, '0x3bfC4807c49250b7D966018EE596fd9D5C677e3D'.toLowerCase()], // wallet
    [FtmAddresses.LINK_TOKEN, '0xd061c6586670792331E14a80f3b3Bb267189C681'.toLowerCase()], // Spirit LPs (SPIRIT-LP)
    [FtmAddresses.DOLA_TOKEN, '0x4d7928e993125A9Cefe7ffa9aB637653654222E2'.toLowerCase()], // xChainFed
    [FtmAddresses.MIM_TOKEN, '0x2dd7c9371965472e5a5fd28fbe165007c61439e1'.toLowerCase()], // curve pool
    [FtmAddresses.BIFI_TOKEN, '0x7fb900c14c9889a559c777d016a885995ce759ee'.toLowerCase()], // BeefyRewardPool
    [FtmAddresses.TUSD_TOKEN, '0xa3abb8bcc6ffea82d3a0a8f800050f684db27db8'.toLowerCase()], // Some strategy
    [FtmAddresses.FBTC_TOKEN, '0x1f45Df42E81892260f50A256bBE7120d6624c2F1'.toLowerCase()], // wallet
    [FtmAddresses.FETH_TOKEN, '0x15a3f675184a4e09877ed10ad8080438ea9e35ae'.toLowerCase()], // wallet
    [FtmAddresses.g3CRV_TOKEN, '0xd4f94d0aaa640bbb72b5eec2d85f6d114d81a88e'.toLowerCase()], // gauge
    [FtmAddresses.USD_BTC_ETH_CRV_TOKEN, '0x00702bbdead24c40647f235f15971db0867f6bdb'.toLowerCase()], // gauge
    [FtmAddresses.TETU_TOKEN, '0xf239F89992688cE2539cf637614Cc3f8866Ea433'.toLowerCase()], // xTETU
    [FtmAddresses.DAI_TOKEN, '0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E'.toLowerCase()], // itself
    [FtmAddresses.WBTC_TOKEN, '0x38aca5484b8603373acc6961ecd57a6a594510a3'.toLowerCase()], // geist
    [FtmAddresses.WETH_TOKEN, '0x25c130b2624cf12a4ea30143ef50c5d68cefa22f'.toLowerCase()], // geist
    [FtmAddresses._2poolCrv_TOKEN, '0x8866414733F22295b7563f9C5299715D2D76CAf4'.toLowerCase()], // gauge
    [FtmAddresses.renCRV_TOKEN, '0xBdFF0C27dd073C119ebcb1299a68A6A92aE607F0'.toLowerCase()], // gauge
    [FtmAddresses.FRAX_TOKEN, '0x7a656B342E14F745e2B164890E88017e27AE7320'.toLowerCase()], // curve pool
    [FtmAddresses.SPELL_TOKEN, '0x4f41D03631Ea4dC14016CcF90690d6D22b24C12D'.toLowerCase()], // spirit lp
    [FtmAddresses.TOMB_TOKEN, '0xF50c6dAAAEC271B56FCddFBC38F0b56cA45E6f0d'.toLowerCase()], // tomb treasury Fund
    [FtmAddresses.TSHARE_TOKEN, '0x8764DE60236C5843D9faEB1B638fbCE962773B67'.toLowerCase()], // tomb masonry
    [FtmAddresses.BOO_TOKEN, '0xa48d959ae2e88f1daa7d5f611e01908106de7598'.toLowerCase()], // xBOO
    [FtmAddresses.BPT_WAGMI_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()], // beets masterchef
    [FtmAddresses.BPT_WAGMI_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_BEETS_USDC_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_BEETS_FTM_TOKEN, '0xfcef8a994209d6916eb2c86cdd2afd60aa6f54b1'.toLowerCase()],
    [FtmAddresses.BPT_GRAND_ORCH_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_FTM_SONATA_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_E_MAJOR_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_B_MAJOR_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_CLASSIC_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_LBP_DANCE_DEGEN_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_FTM_OPERA_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_BeetXLP_MIM_USDC_USDT_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_BLP_USDC_MAI_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_BPT_DANIELE_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_MOOSIC_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_PAINT_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_FTMUSIC_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_GUQINQI_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_QUARTET_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_ICEFIRE_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_CRVLINK_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_HND_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_BNBARON_TOKEN, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_STABEET, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BPT_asUSDC, '0x8166994d9ebbe5829ec86bd81258149b87facfd3'.toLowerCase()],
    [FtmAddresses.BEETS_TOKEN, '0x2d6de488Fc701eB5AC687dE9Ad06F58fcBaE45DB'.toLowerCase()], // spirit lp
    [FtmAddresses.SPIRIT_TOKEN, '0x2FBFf41a9efAEAE77538bd63f1ea489494acdc08'.toLowerCase()], // inSpirit
    [FtmAddresses.TAROT_TOKEN, '0x11D90eA9d16e1Ee5879B299A819F6D618816D70F'.toLowerCase()], // spooky lp
  ]);

  public static async balanceOf(tokenAddress: string, account: string): Promise<BigNumber> {
    return ERC20__factory.connect(tokenAddress, ethers.provider).balanceOf(account);
  }

  public static async totalSupply(tokenAddress: string): Promise<BigNumber> {
    return ERC20__factory.connect(tokenAddress, ethers.provider).totalSupply();
  }

  public static async approve(tokenAddress: string, signer: SignerWithAddress, spender: string, amount: string) {
    console.log('approve', await TokenUtils.tokenSymbol(tokenAddress), amount);
    return ERC20__factory.connect(tokenAddress, signer).approve(spender, BigNumber.from(amount));
  }

  public static async approveNFT(tokenAddress: string, signer: SignerWithAddress, spender: string, id: string) {
    console.log('approve', await TokenUtils.tokenSymbol(tokenAddress), id);
    await TokenUtils.checkNftBalance(tokenAddress, signer.address, id);
    return ERC20__factory.connect(tokenAddress, signer).approve(spender, id);
  }

  public static async allowance(tokenAddress: string, signer: SignerWithAddress, spender: string): Promise<BigNumber> {
    return ERC20__factory.connect(tokenAddress, signer).allowance(signer.address, spender);
  }

  public static async transfer(tokenAddress: string, signer: SignerWithAddress, destination: string, amount: string) {
    console.log('transfer', await TokenUtils.tokenSymbol(tokenAddress), amount);
    return ERC20__factory.connect(tokenAddress, signer).transfer(destination, BigNumber.from(amount))
  }

  public static async wrapNetworkToken(signer: SignerWithAddress, amount: string) {
    const token = IWmatic__factory.connect(await DeployerUtilsLocal.getNetworkTokenAddress(), signer);
    return token.deposit({value: parseUnits(amount), from: signer.address});
  }

  public static async decimals(tokenAddress: string): Promise<number> {
    return ERC20__factory.connect(tokenAddress, ethers.provider).decimals();
  }

  public static async tokenName(tokenAddress: string): Promise<string> {
    return ERC20__factory.connect(tokenAddress, ethers.provider).name();
  }

  public static async tokenSymbol(tokenAddress: string): Promise<string> {
    return ERC20__factory.connect(tokenAddress, ethers.provider).symbol();
  }

  public static async checkBalance(tokenAddress: string, account: string, amount: string) {
    const bal = await TokenUtils.balanceOf(tokenAddress, account);
    expect(bal.gt(BigNumber.from(amount))).is.eq(true, 'Balance less than amount');
    return bal;
  }

  public static async tokenOfOwnerByIndex(tokenAddress: string, account: string, index: number) {
    return IERC721Enumerable__factory.connect(tokenAddress, ethers.provider).tokenOfOwnerByIndex(account, index);
  }

  public static async checkNftBalance(tokenAddress: string, account: string, id: string) {
    const nftCount = (await TokenUtils.balanceOf(tokenAddress, account)).toNumber();
    let found = false;
    let tokenId;
    for (let i = 0; i < nftCount; i++) {
      tokenId = await TokenUtils.tokenOfOwnerByIndex(tokenAddress, account, i);
      console.log('NFT', tokenId)
      if (tokenId.toString() === id) {
        found = true;
        break;
      }
    }
    expect(found).is.eq(true);
    return tokenId;
  }

  public static async getToken(token: string, to: string, amount?: BigNumber) {
    const start = Date.now();
    console.log('transfer token from biggest holder', token, amount?.toString());

    if (token.toLowerCase() === await DeployerUtilsLocal.getNetworkTokenAddress()) {
      await IWmatic__factory.connect(token, await DeployerUtilsLocal.impersonate(to)).deposit({value: amount});
      return amount;
    }

    const holder = TokenUtils.TOKEN_HOLDERS.get(token.toLowerCase()) as string;
    if (!holder) {
      throw new Error('Please add holder for ' + token);
    }
    const signer = await DeployerUtilsLocal.impersonate(holder);
    const balance = (await TokenUtils.balanceOf(token, holder)).div(100);
    console.log('holder balance', balance.toString());
    if (amount) {
      await TokenUtils.transfer(token, signer, to, amount.toString());
    } else {
      await TokenUtils.transfer(token, signer, to, balance.toString());
    }
    Misc.printDuration('getToken completed', start);
    return balance;
  }

}
