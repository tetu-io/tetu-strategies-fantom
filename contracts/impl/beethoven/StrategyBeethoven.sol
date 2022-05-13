// SPDX-License-Identifier: ISC
/**
* By using this software, you understand, acknowledge and accept that Tetu
* and/or the underlying software are provided “as is” and “as available”
* basis and without warranties or representations of any kind either expressed
* or implied. Any use of this open source software released under the ISC
* Internet Systems Consortium license is done at your own risk to the fullest
* extent permissible pursuant to applicable law any and all liability as well
* as all warranties, including any fitness for a particular purpose with respect
* to Tetu and/or the underlying software and the use thereof are disclaimed.
*/
pragma solidity 0.8.4;

import "../../strategies/beethoven/BeethovenBase.sol";

contract StrategyBeethoven is BeethovenBase {

  // MASTER_CHEF
  address private constant _MASTER_CHEF = address(0x8166994d9ebBe5829EC86Bd81258149B87faCfd3);
  address private constant _BEETHOVEN_VAULT = address(0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce);

  // rewards
  address private constant BEETS = address(0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e);
  address[] private poolRewards = [BEETS];

  constructor(
    address _controller,
    address _vault,
    address _underlying,
    uint _poolId,
    address _depositToken,
    bytes32 _beethovenPoolId,
    bytes32 _rewardToDepositPoolId

  ) BeethovenBase(
    _controller,
    _vault,
    _underlying,
    poolRewards,
    _MASTER_CHEF,
    _poolId,
    _BEETHOVEN_VAULT,
    _depositToken,
    _beethovenPoolId,
    _rewardToDepositPoolId
  ) {
    require(_underlying != address(0), "zero underlying");
    require(_depositToken != address(0), "zero _depositToken");
  }

}
