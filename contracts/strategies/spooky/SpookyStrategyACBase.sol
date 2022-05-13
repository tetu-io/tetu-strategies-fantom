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

import "@tetu_io/tetu-contracts/contracts/base/strategies/StrategyBase.sol";
import "../../third_party/spooky/ISpookyMasterChef.sol";

/// @title Abstract contract for SpookySwap strategy implementation
/// @author belbix
abstract contract SpookyStrategyACBase is StrategyBase {
  using SafeERC20 for IERC20;

  // ************ VARIABLES **********************
  /// @notice Strategy type for statistical purposes
  string public constant override STRATEGY_NAME = "SpookyStrategyACBase";
  /// @notice Version of the contract
  /// @dev Should be incremented when contract changed
  string public constant VERSION = "1.0.1";
  /// @dev 10% buyback
  uint256 private constant _BUY_BACK_RATIO = 10_00;

  /// @notice MasterChef rewards pool
  address public pool;
  /// @notice MasterChef rewards pool ID
  uint256 public poolID;
  /// @notice Uniswap router for underlying LP
  address public router;

  /// @notice Contract constructor using on strategy implementation
  /// @dev The implementation should check each parameter
  constructor(
    address _controller,
    address _underlying,
    address _vault,
    address[] memory __rewardTokens,
    address _pool,
    uint256 _poolID,
    address _router
  ) StrategyBase(_controller, _underlying, _vault, __rewardTokens, _BUY_BACK_RATIO) {
    require(_pool != address(0), "SSAB: Zero address pool");
    pool = _pool;
    poolID = _poolID;
    router = _router;

    ISpookyMasterChef.PoolInfo memory poolInfo = ISpookyMasterChef(pool).poolInfo(_poolID);
    require(address(poolInfo.lpToken) == _underlyingToken, "SSAB: Wrong underlying");
  }

  // ************* VIEWS *******************

  /// @notice Strategy balance in the MasterChef pool
  /// @return bal Balance amount in underlying tokens
  function rewardPoolBalance() public override view returns (uint256) {
    return ISpookyMasterChef(pool).userInfo(poolID, address(this)).amount;
  }

  /// @notice Return approximately amount of reward tokens ready to claim in MasterChef pool
  /// @dev Don't use it in any internal logic, only for statistical purposes
  /// @return Array with amounts ready to claim
  function readyToClaim() external view override returns (uint256[] memory) {
    uint256[] memory toClaim = new uint256[](1);
    toClaim[0] = ISpookyMasterChef(pool).pendingBOO(poolID, address(this));
    return toClaim;
  }

  /// @notice TVL of the underlying in the MasterChef pool
  /// @dev Only for statistic
  /// @return Pool TVL
  function poolTotalAmount() external view override returns (uint256) {
    return IERC20(_underlyingToken).balanceOf(pool);
  }

  // ************ GOVERNANCE ACTIONS **************************

  /// @notice Claim rewards from external project and send them to FeeRewardForwarder
  function doHardWork() external onlyNotPausedInvesting override hardWorkers {
    investAllUnderlying();
    withdrawAndClaimFromPool(0);
    liquidateReward();
  }

  // ************ INTERNAL LOGIC IMPLEMENTATION **************************

  /// @dev Deposit underlying to MasterChef pool
  /// @param amount Deposit amount
  function depositToPool(uint256 amount) internal override {
    IERC20(_underlyingToken).safeApprove(pool, 0);
    IERC20(_underlyingToken).safeApprove(pool, amount);
    ISpookyMasterChef(pool).deposit(poolID, amount);
  }

  /// @dev Withdraw underlying from MasterChef pool
  /// @param amount Deposit amount
  function withdrawAndClaimFromPool(uint256 amount) internal override {
    ISpookyMasterChef(pool).withdraw(poolID, amount);
  }

  /// @dev Exit from external project without caring about rewards
  ///      For emergency cases only!
  function emergencyWithdrawFromPool() internal override {
    ISpookyMasterChef(pool).emergencyWithdraw(poolID);
  }

  /// @dev Do something useful with farmed rewards
  function liquidateReward() internal override {
    autocompoundLP(router);
    // if we have not enough balance for buybacks we will autocompound 100%
    liquidateRewardSilently();
  }

}
