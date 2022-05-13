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

interface IAnnouncer {

  /// @dev Time lock operation codes
  enum TimeLockOpCodes {
    // TimeLockedAddresses
    Governance, // 0
    Dao, // 1
    FeeRewardForwarder, // 2
    Bookkeeper, // 3
    MintHelper, // 4
    RewardToken, // 5
    FundToken, // 6
    PsVault, // 7
    Fund, // 8
    // TimeLockedRatios
    PsRatio, // 9
    FundRatio, // 10
    // TimeLockedTokenMoves
    ControllerTokenMove, // 11
    StrategyTokenMove, // 12
    FundTokenMove, // 13
    // Other
    TetuProxyUpdate, // 14
    StrategyUpgrade, // 15
    Mint, // 16
    Announcer, // 17
    ZeroPlaceholder, //18
    VaultController, //19
    RewardBoostDuration, //20
    RewardRatioWithoutBoost, //21
    VaultStop //22
  }

  /// @dev Holder for human readable info
  struct TimeLockInfo {
    TimeLockOpCodes opCode;
    bytes32 opHash;
    address target;
    address[] adrValues;
    uint256[] numValues;
  }

  event AddressChangeAnnounce(uint8 opCode, address newAddress);
  event AnnounceClosed(bytes32 opHash);
  event MintAnnounced(
    uint256 totalAmount,
    address _distributor,
    address _otherNetworkFund
  );
  event ProxyUpgradeAnnounced(address _contract, address _implementation);
  event RatioChangeAnnounced(
    uint8 opCode,
    uint256 numerator,
    uint256 denominator
  );
  event StrategyUpgradeAnnounced(address _contract, address _implementation);
  event TokenMoveAnnounced(
    uint8 opCode,
    address target,
    address token,
    uint256 amount
  );
  event UintChangeAnnounce(uint8 opCode, uint256 newValue);
  event UpdateController(address oldValue, address newValue);
  event VaultStop(address _contract);

  function VERSION() external view returns (string memory);

  function announceAddressChange(uint8 opCode, address newAddress) external;

  function announceMint(
    uint256 totalAmount,
    address _distributor,
    address _otherNetworkFund,
    bool mintAllAvailable
  ) external;

  function announceRatioChange(
    uint8 opCode,
    uint256 numerator,
    uint256 denominator
  ) external;

  function announceStrategyUpgrades(
    address[] memory _targets,
    address[] memory _strategies
  ) external;

  function announceTetuProxyUpgrade(
    address _contract,
    address _implementation
  ) external;

  function announceTetuProxyUpgradeBatch(
    address[] memory _contracts,
    address[] memory _implementations
  ) external;

  function announceTokenMove(
    uint8 opCode,
    address target,
    address token,
    uint256 amount
  ) external;

  function announceUintChange(uint8 opCode, uint256 newValue) external;

  function announceVaultStopBatch(address[] memory _vaults) external;

  function clearAnnounce(
    bytes32 opHash,
    uint8 opCode,
    address target
  ) external;

  function closeAnnounce(
    uint8 opCode,
    bytes32 opHash,
    address target
  ) external;

  function controller() external view returns (address adr);

  function created() external view returns (uint256 ts);

  function initialize(address _controller, uint256 _timeLock) external;

  function initializeControllable(address _controller) external;

  function isController(address _adr) external view returns (bool);

  function isGovernance(address _adr) external view returns (bool);

  function multiOpCodes(uint8) external view returns (bool);

  function multiTimeLockIndexes(uint8, address)
  external
  view
  returns (uint256);

  function timeLock() external view returns (uint256 result);

  function timeLockIndexes(uint8) external view returns (uint256);

  function timeLockInfo(uint256 idx)
  external
  view
  returns (IAnnouncer.TimeLockInfo memory);

  function timeLockInfosLength() external view returns (uint256);

  function timeLockSchedule(bytes32) external view returns (uint256);

}
