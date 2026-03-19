import Array "mo:core/Array";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import List "mo:core/List";
import Int "mo:core/Int";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Iter "mo:core/Iter";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";



actor {
  // Access control must be initialized first
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  include MixinStorage();

  // Types
  public type AssetCategory = {
    #laptop;
    #desktop;
    #monitor;
    #server;
    #printer;
    #peripheral;
    #other;
  };

  public type AssetStatus = {
    #available;
    #assigned;
    #inRepair;
    #retired;
    #inStorage;
  };

  // Public Asset type (includes employeeCode for API consumers)
  public type Asset = {
    id : Nat;
    name : Text;
    category : AssetCategory;
    serialNumber : Text;
    assignedUser : ?Text;
    employeeCode : ?Text;
    location : Text;
    status : AssetStatus;
    purchaseDate : ?Text;
    warrantyDate : ?Text;
    notes : ?Text;
    photoId : ?Storage.ExternalBlob;
    createdAt : Time.Time;
  };

  public type AssetInput = {
    id : ?Nat;
    name : Text;
    category : AssetCategory;
    serialNumber : Text;
    assignedUser : ?Text;
    employeeCode : ?Text;
    location : Text;
    status : AssetStatus;
    purchaseDate : ?Text;
    warrantyDate : ?Text;
    notes : ?Text;
    photoId : ?Storage.ExternalBlob;
  };

  public type AssignmentHistoryEntry = {
    id : Nat;
    assetId : Nat;
    assetName : Text;
    changedBy : Principal.Principal;
    fromAssignee : ?Text;
    toAssignee : ?Text;
    fromStatus : AssetStatus;
    toStatus : AssetStatus;
    timestamp : Time.Time;
  };

  public type Stats = {
    total : Nat;
    assigned : Nat;
    inRepair : Nat;
    available : Nat;
  };

  public type UserProfile = {
    name : Text;
  };

  public type WarrantyStats = {
    total : Nat;
    expiringSoon : Nat;
    expired : Nat;
    active : Nat;
  };

  public type UserWithRole = {
    principal : Principal.Principal;
    role : AccessControl.UserRole;
  };

  // Store Types — StoreAsset must NOT change shape to preserve stable variable compatibility.
  // employeeCode is stored separately in assetEmployeeCodes.
  public type StoreAsset = {
    id : Nat;
    name : Text;
    category : AssetCategory;
    serialNumber : Text;
    assignedUser : ?Text;
    location : Text;
    status : AssetStatus;
    purchaseDate : ?Text;
    warrantyDate : ?Text;
    notes : ?Text;
    photoId : ?Storage.ExternalBlob;
    createdAt : Time.Time;
  };

  public type StoreAssignmentHistoryEntry = {
    id : Nat;
    assetId : Nat;
    assetName : Text;
    changedBy : Principal.Principal;
    fromAssignee : ?Text;
    toAssignee : ?Text;
    fromStatus : AssetStatus;
    toStatus : AssetStatus;
    timestamp : Time.Time;
  };

  public type StoreUserProfile = {
    name : Text;
  };

  module AssignmentHistoryEntry {
    public func compare(a : AssignmentHistoryEntry, b : AssignmentHistoryEntry) : Order.Order {
      Int.compare(b.timestamp, a.timestamp);
    };
  };

  module Asset {
    public func compare(a : Asset, b : Asset) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  // State
  var nextAssetId = 1;
  var nextHistoryId = 1;

  let assets = Map.empty<Nat, StoreAsset>();
  let history = Map.empty<Nat, StoreAssignmentHistoryEntry>();
  let initialized = Set.empty<Nat>();
  let userProfiles = Map.empty<Principal.Principal, StoreUserProfile>();
  // Separate stable map for employee codes — added without touching StoreAsset
  let assetEmployeeCodes = Map.empty<Nat, Text>();

  // Helper: merge StoreAsset with its employee code into the public Asset type
  func toAsset(s : StoreAsset) : Asset {
    {
      id = s.id;
      name = s.name;
      category = s.category;
      serialNumber = s.serialNumber;
      assignedUser = s.assignedUser;
      employeeCode = assetEmployeeCodes.get(s.id);
      location = s.location;
      status = s.status;
      purchaseDate = s.purchaseDate;
      warrantyDate = s.warrantyDate;
      notes = s.notes;
      photoId = s.photoId;
      createdAt = s.createdAt;
    };
  };

  // System functions
  system func preupgrade() {};
  system func postupgrade() {
    if (initialized.isEmpty()) {
      addSampleAssets();
      initialized.add(0);
    };
  };

  // Sample data
  func addSampleAssets() {
    let samples : [AssetInput] = [
      {
        id = null;
        name = "Dell XPS 13";
        category = #laptop;
        serialNumber = "XPS123456";
        assignedUser = null;
        employeeCode = null;
        location = "Office 101";
        status = #available;
        purchaseDate = ?"2022-01-15";
        warrantyDate = ?"2025-01-15";
        notes = ?"Ultrabook";
        photoId = null;
      },
      {
        id = null;
        name = "HP EliteBook";
        category = #laptop;
        serialNumber = "HP987654";
        assignedUser = ?"Alice Smith";
        employeeCode = null;
        location = "Remote";
        status = #assigned;
        purchaseDate = ?"2021-11-03";
        warrantyDate = ?"2024-11-03";
        notes = ?"Travel laptop";
        photoId = null;
      },
      {
        id = null;
        name = "Dell OptiPlex 7070";
        category = #desktop;
        serialNumber = "DESK1234";
        assignedUser = ?"Bob Jones";
        employeeCode = null;
        location = "Office 102";
        status = #assigned;
        purchaseDate = ?"2020-08-25";
        warrantyDate = ?"2023-08-25";
        notes = null;
        photoId = null;
      },
      {
        id = null;
        name = "Samsung Curved Monitor";
        category = #monitor;
        serialNumber = "MON456";
        assignedUser = null;
        employeeCode = null;
        location = "Storage";
        status = #available;
        purchaseDate = ?"2022-05-10";
        warrantyDate = ?"2024-05-10";
        notes = ?"Spare";
        photoId = null;
      },
      {
        id = null;
        name = "HP LaserJet Printer";
        category = #printer;
        serialNumber = "PRINTER789";
        assignedUser = null;
        employeeCode = null;
        location = "Office 100";
        status = #inStorage;
        purchaseDate = ?"2019-04-30";
        warrantyDate = ?"2022-04-30";
        notes = ?"Shared printer";
        photoId = null;
      },
      {
        id = null;
        name = "Logitech Mouse";
        category = #peripheral;
        serialNumber = "MOUSE123";
        assignedUser = ?"Carol Lee";
        employeeCode = null;
        location = "Office 103";
        status = #assigned;
        purchaseDate = ?"2021-12-01";
        warrantyDate = ?"2023-12-01";
        notes = null;
        photoId = null;
      },
      {
        id = null;
        name = "Dell PowerEdge R740";
        category = #server;
        serialNumber = "SERVER321";
        assignedUser = null;
        employeeCode = null;
        location = "Data Center";
        status = #inRepair;
        purchaseDate = ?"2018-07-11";
        warrantyDate = ?"2023-07-11";
        notes = ?"Production server";
        photoId = null;
      },
      {
        id = null;
        name = "MacBook Pro";
        category = #laptop;
        serialNumber = "MBP111222";
        assignedUser = ?"David Kim";
        employeeCode = null;
        location = "Remote";
        status = #assigned;
        purchaseDate = ?"2020-10-21";
        warrantyDate = ?"2023-10-21";
        notes = null;
        photoId = null;
      },
    ];

    samples.forEach(func(input) { ignore addAssetInternal(input) });
  };

  // Internal Add Asset
  func addAssetInternal(input : AssetInput) : Nat {
    let id = nextAssetId;
    nextAssetId += 1;

    let asset : StoreAsset = {
      id;
      name = input.name;
      category = input.category;
      serialNumber = input.serialNumber;
      assignedUser = input.assignedUser;
      location = input.location;
      status = input.status;
      purchaseDate = input.purchaseDate;
      warrantyDate = input.warrantyDate;
      notes = input.notes;
      photoId = input.photoId;
      createdAt = Time.now();
    };

    assets.add(id, asset);

    // Store employee code separately
    switch (input.employeeCode) {
      case (null) { assetEmployeeCodes.remove(id) };
      case (?code) { assetEmployeeCodes.add(id, code) };
    };

    id;
  };

  // Bootstrap admin - allows first user to become admin with no existing admins
  public shared ({ caller }) func bootstrapAdmin() : async Bool {
    if (caller.isAnonymous()) {
      return false;
    };
    // Only allow bootstrap if no admin has been assigned yet
    if (accessControlState.adminAssigned) {
      return false;
    };
    // Directly assign this caller as admin
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    true;
  };

  // Get all users with their roles (admin only)
  public query ({ caller }) func getAllUsersWithRoles() : async [UserWithRole] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view user roles");
    };
    accessControlState.userRoles.entries().map(
      func((p, r)) : UserWithRole { { principal = p; role = r } }
    ).toArray();
  };

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal.Principal) : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Public CRUD
  public shared ({ caller }) func addAsset(input : AssetInput) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };
    addAssetInternal(input);
  };

  public shared ({ caller }) func updateAsset(id : Nat, input : AssetInput) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    switch (assets.get(id)) {
      case (null) { Runtime.trap("Asset not found") };
      case (?existing) {
        let updated : StoreAsset = {
          id = existing.id;
          name = input.name;
          category = input.category;
          serialNumber = input.serialNumber;
          assignedUser = input.assignedUser;
          location = input.location;
          status = input.status;
          purchaseDate = input.purchaseDate;
          warrantyDate = input.warrantyDate;
          notes = input.notes;
          photoId = input.photoId;
          createdAt = existing.createdAt;
        };

        // Update employee code in its separate map
        switch (input.employeeCode) {
          case (null) { assetEmployeeCodes.remove(id) };
          case (?code) { assetEmployeeCodes.add(id, code) };
        };

        addToHistory(id, caller, existing.status, input);
        assets.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteAsset(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can perform this action");
    };

    assets.remove(id);
    assetEmployeeCodes.remove(id);
  };

  public query ({ caller }) func getAsset(id : Nat) : async Asset {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    switch (assets.get(id)) {
      case (null) { Runtime.trap("Asset not found") };
      case (?asset) { toAsset(asset) };
    };
  };

  public query ({ caller }) func getAllAssets() : async [Asset] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    assets.values().map(func(a) { toAsset(a) }).toArray().sort();
  };

  public query ({ caller }) func getAssetsByStatus(status : AssetStatus) : async [Asset] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    assets.values().toArray().filter(func(asset) { asset.status == status }).map(toAsset).sort();
  };

  public query ({ caller }) func getAssetsByCategory(category : AssetCategory) : async [Asset] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    assets.values().toArray().filter(func(asset) { asset.category == category }).map(toAsset).sort();
  };

  public query ({ caller }) func searchAssets(term : Text) : async [Asset] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    let lowerTerm = term.toLower();
    assets.values().toArray().filter(
      func(asset) {
        asset.name.toLower().contains(#text(lowerTerm)) or asset.serialNumber.toLower().contains(#text(lowerTerm)) or asset.location.toLower().contains(#text(lowerTerm));
      }
    ).map(toAsset).sort();
  };

  public query ({ caller }) func getAssetsByLocation(location : Text) : async [Asset] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    assets.values().toArray().filter(
      func(asset) {
        asset.location.toLower().contains(#text(location.toLower()));
      }
    ).map(toAsset).sort();
  };

  // History
  func addToHistory(assetId : Nat, changedBy : Principal.Principal, fromStatus : AssetStatus, input : AssetInput) {
    let entry : StoreAssignmentHistoryEntry = {
      id = nextHistoryId;
      assetId;
      assetName = input.name;
      changedBy;
      fromAssignee = null;
      toAssignee = input.assignedUser;
      fromStatus;
      toStatus = input.status;
      timestamp = Time.now();
    };

    nextHistoryId += 1;
    history.add(entry.id, entry);
  };

  public query ({ caller }) func getHistory() : async [AssignmentHistoryEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    history.values().map(func(h) { h }).toArray().sort();
  };

  public query ({ caller }) func getHistoryForAsset(assetId : Nat) : async [AssignmentHistoryEntry] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    let filtered = history.values().toArray().filter(func(entry) { entry.assetId == assetId });
    filtered.sort();
  };

  // Stats
  public query ({ caller }) func getStats() : async Stats {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    let allAssets = assets.values().toArray();
    let total = allAssets.size();

    let assigned = allAssets.filter(func(asset) { asset.status == #assigned }).size();
    let inRepair = allAssets.filter(func(asset) { asset.status == #inRepair }).size();
    let available = allAssets.filter(func(asset) { asset.status == #available }).size();

    {
      total;
      assigned;
      inRepair;
      available;
    };
  };

  public query ({ caller }) func getWarrantyStats() : async WarrantyStats {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };

    let allAssets = assets.values().toArray();
    let total = allAssets.filter(func(asset) { asset.warrantyDate != null }).size();

    {
      total;
      expiringSoon = 0;
      expired = 0;
      active = total;
    };
  };
};
