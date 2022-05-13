import {DoHardWorkLoopBase} from "../../DoHardWorkLoopBase";
import {StrategyScreamFold__factory} from "../../../../typechain";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import {Misc} from "../../../../scripts/utils/tools/Misc";

const {expect} = chai;
chai.use(chaiAsPromised);

export class ScreamDoHardWork extends DoHardWorkLoopBase {

  public async loopStartActions(i: number) {
    await super.loopStartActions(i);
    const start = Date.now();
    const foldContract = StrategyScreamFold__factory.connect(this.strategy.address, this.signer);
    let folding = await foldContract.fold();
    // switch off folding on the 1/3 of cycles
    if (i === Math.floor(this.loops / 3) && folding) {
      await foldContract.stopFolding();
      folding = await foldContract.fold();
      expect(folding).is.eq(false);
    }
    // switch on folding on the 2/3 of cycles
    if (i === Math.floor(this.loops / 3) * 2 && !folding) {
      await foldContract.startFolding();
      folding = await foldContract.fold();
      expect(folding).is.eq(true);
    }

    console.log('------ FOLDING', 'cycle:' + i, 'enabled:' + folding, 'profitable:' + await foldContract.isFoldingProfitable());
    Misc.printDuration('Loop preparation completed', start);
  }

}
