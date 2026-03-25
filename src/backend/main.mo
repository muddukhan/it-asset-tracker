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

  public type LocalUser = {
    id : Nat;
    name : Text;
    username : Text;
    accessLevel : Text;
    employeeCode : Text;
    department : Text;
    email : Text;
    notes : ?Text;
  };

  public type LocalUserInput = {
    name : Text;
    username : Text;
    password : Text;
    accessLevel : Text;
    employeeCode : Text;
    department : Text;
    email : Text;
    notes : ?Text;
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
    processorType : ?Text;
    ram : ?Text;
    storage : ?Text;
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
    processorType : ?Text;
    ram : ?Text;
    storage : ?Text;
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

  // Software Inventory Input type (includes assignedTo for API consumers)
  public type StoreSoftwareInput = {
    id : ?Nat;
    name : Text;
    vendor : Text;
    purchaseDate : ?Text;
    licenseExpiry : ?Text;
    licenseKey : ?Text;
    licenseType : ?Text;
    notes : ?Text;
    assignedTo : ?Text;
  };

  // Public Software type returned by API (includes assignedTo merged from separate map)
  public type StoreSoftware = {
    id : Nat;
    name : Text;
    vendor : Text;
    purchaseDate : ?Text;
    licenseExpiry : ?Text;
    licenseKey : ?Text;
    licenseType : ?Text;
    notes : ?Text;
    assignedTo : ?Text;
    createdAt : Time.Time;
  };

  // Store Types — Do NOT change shape to preserve compatibility with (de)serialization!
  // StoreAsset must NOT change shape to preserve stable variable compatibility
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
    processorType : ?Text;
    ram : ?Text;
    storage : ?Text;
  };

  // StoreSoftwareRecord is the stable storage type — DO NOT ADD FIELDS (breaks upgrade compatibility)
  // Use softwareAssignedTo map for new fields
  type StoreSoftwareRecord = {
    id : Nat;
    name : Text;
    vendor : Text;
    purchaseDate : ?Text;
    licenseExpiry : ?Text;
    licenseKey : ?Text;
    licenseType : ?Text;
    notes : ?Text;
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

  public type StoreLocalUser = {
    id : Nat;
    name : Text;
    employeeCode : Text;
    department : Text;
    email : Text;
    notes : ?Text;
  };

  // Separate stable type for credentials - stored in a separate map to preserve StoreLocalUser compatibility
  public type StoreLocalUserCredentials = {
    username : Text;
    password : Text;
    accessLevel : Text;
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

  module StoreSoftware {
    public func compare(a : StoreSoftware, b : StoreSoftware) : Order.Order {
      Nat.compare(a.id, b.id);
    };
  };

  // Global state (will be migrated from old backend)
  var nextAssetId = 1;
  var nextHistoryId = 1;
  var nextLocalUserId = 1;
  var nextSoftwareId = 1;

  let assets = Map.empty<Nat, StoreAsset>();
  let history = Map.empty<Nat, StoreAssignmentHistoryEntry>();
  let initialized = Set.empty<Nat>();
  let userProfiles = Map.empty<Principal.Principal, StoreUserProfile>();
  let localUsers = Map.empty<Nat, StoreLocalUser>();
  let localUserCredentials = Map.empty<Nat, StoreLocalUserCredentials>();
  let assetEmployeeCodes = Map.empty<Nat, Text>();
  // softwareInventory uses StoreSoftwareRecord (stable type - shape must not change)
  let softwareInventory = Map.empty<Nat, StoreSoftwareRecord>();
  // assignedTo stored separately to preserve softwareInventory stable compatibility
  let softwareAssignedTo = Map.empty<Nat, Text>();

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
      processorType = s.processorType;
      ram = s.ram;
      storage = s.storage;
    };
  };

  // Helper: merge StoreSoftwareRecord with assignedTo into public StoreSoftware type
  func toSoftware(s : StoreSoftwareRecord) : StoreSoftware {
    {
      id = s.id;
      name = s.name;
      vendor = s.vendor;
      purchaseDate = s.purchaseDate;
      licenseExpiry = s.licenseExpiry;
      licenseKey = s.licenseKey;
      licenseType = s.licenseType;
      notes = s.notes;
      assignedTo = softwareAssignedTo.get(s.id);
      createdAt = s.createdAt;
    };
  };

  // Helper converter for LocalUser
  func toLocalUser(storeUser : StoreLocalUser) : LocalUser {
    let creds = localUserCredentials.get(storeUser.id);
    {
      id = storeUser.id;
      name = storeUser.name;
      username = switch (creds) { case (?c) { c.username }; case (null) { "" } };
      accessLevel = switch (creds) { case (?c) { c.accessLevel }; case (null) { "readonly" } };
      employeeCode = storeUser.employeeCode;
      department = storeUser.department;
      email = storeUser.email;
      notes = storeUser.notes;
    };
  };

  func softwareInputToRecord(input : ?Nat, software : StoreSoftwareInput, createdAt : Time.Time) : StoreSoftwareRecord {
    {
      id = switch (input) {
        case (?id) { id };
        case (null) { nextSoftwareId };
      };
      name = software.name;
      vendor = software.vendor;
      purchaseDate = software.purchaseDate;
      licenseExpiry = software.licenseExpiry;
      licenseKey = software.licenseKey;
      licenseType = software.licenseType;
      notes = software.notes;
      createdAt;
    };
  };

  // System functions
  system func preupgrade() {};
  system func postupgrade() {
    if (initialized.isEmpty()) {
      addSampleAssets();
      addSampleSoftware();
      initialized.add(0);
    };
  };

  func addSampleSoftware() {
    let samples : [StoreSoftwareInput] = [
      {
        id = null;
        name = "Microsoft Office 365";
        vendor = "Microsoft";
        purchaseDate = ?"2020-05-15";
        licenseExpiry = ?"2023-05-15";
        licenseKey = ?"XXXXX-XXXXX-XXXXX-XXXXX-XXXXX";
        licenseType = ?"Enterprise";
        notes = ?"3-year subscription";
        assignedTo = null;
      },
      {
        id = null;
        name = "Adobe Creative Cloud";
        vendor = "Adobe";
        purchaseDate = ?"2021-08-03";
        licenseExpiry = ?"2024-08-03";
        licenseKey = ?"YYYYY-YYYYY-YYYYY-YYYYY-YYYYY";
        licenseType = ?"Annual";
        notes = null;
        assignedTo = null;
      },
      {
        id = null;
        name = "Slack";
        vendor = "Slack Technologies";
        purchaseDate = ?"2022-02-11";
        licenseExpiry = ?"2023-02-11";
        licenseKey = ?"ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ";
        licenseType = ?"Business Plan";
        notes = ?"Used by entire company";
        assignedTo = null;
      }
    ];
    samples.forEach(func(input) { ignore addSoftwareInternal(input) });
  };

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
        processorType = ?"Intel i7";
        ram = ?"16GB";
        storage = ?"512GB SSD";
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
        processorType = ?"Intel i5";
        ram = ?"8GB";
        storage = ?"256GB SSD";
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
        processorType = ?"Intel i7";
        ram = ?"32GB";
        storage = ?"1TB HDD";
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
        processorType = null;
        ram = null;
        storage = null;
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
        processorType = null;
        ram = null;
        storage = null;
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
        processorType = null;
        ram = null;
        storage = null;
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
        processorType = ?"Intel Xeon";
        ram = ?"128GB";
        storage = ?"4TB SSD";
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
        processorType = ?"Apple M1";
        ram = ?"16GB";
        storage = ?"1TB SSD";
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
      processorType = input.processorType;
      ram = input.ram;
      storage = input.storage;
    };

    assets.add(id, asset);

    // Store employee code separately
    switch (input.employeeCode) {
      case (null) { assetEmployeeCodes.remove(id) };
      case (?code) { assetEmployeeCodes.add(id, code) };
    };

    id;
  };

  // Internal Add Software
  func addSoftwareInternal(input : StoreSoftwareInput) : Nat {
    let id = nextSoftwareId;
    nextSoftwareId += 1;
    let record : StoreSoftwareRecord = softwareInputToRecord(input.id, input, Time.now());
    softwareInventory.add(id, record);
    // Store assignedTo separately
    switch (input.assignedTo) {
      case (null) { softwareAssignedTo.remove(id) };
      case (?v) { softwareAssignedTo.add(id, v) };
    };
    id;
  };

  // Local Users CRUD
  // Helper: check if given credentials belong to a local admin user
  func isLocalAdminCreds(username : Text, password : Text) : Bool {
    if (username == "" or password == "") return false;
    for ((id, creds) in localUserCredentials.entries()) {
      if (creds.username == username and creds.password == password and creds.accessLevel == "admin") {
        return true;
      };
    };
    false;
  };

  // Check admin: either ICP principal admin OR valid local admin credentials
  func isAdminCallerOrCreds(caller : Principal.Principal, adminUsername : Text, adminPassword : Text) : Bool {
    AccessControl.hasPermission(accessControlState, caller, #admin) or isLocalAdminCreds(adminUsername, adminPassword)
  };

  public shared ({ caller }) func addLocalUser(input : LocalUserInput) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can add local users");
    };

    let id = nextLocalUserId;
    nextLocalUserId += 1;

    let localUser : StoreLocalUser = {
      id;
      name = input.name;
      employeeCode = input.employeeCode;
      department = input.department;
      email = input.email;
      notes = input.notes;
    };
    let creds : StoreLocalUserCredentials = {
      username = input.username;
      password = input.password;
      accessLevel = input.accessLevel;
    };

    localUsers.add(id, localUser);
    localUserCredentials.add(id, creds);
    id;
  };

  // Credential-based variant for local admin sessions (no ICP identity)
  public shared func addLocalUserWithCreds(adminUsername : Text, adminPassword : Text, input : LocalUserInput) : async Nat {
    if (not isLocalAdminCreds(adminUsername, adminPassword)) {
      Runtime.trap("Unauthorized: Invalid admin credentials");
    };
    let id = nextLocalUserId;
    nextLocalUserId += 1;
    let localUser : StoreLocalUser = {
      id;
      name = input.name;
      employeeCode = input.employeeCode;
      department = input.department;
      email = input.email;
      notes = input.notes;
    };
    let creds : StoreLocalUserCredentials = {
      username = input.username;
      password = input.password;
      accessLevel = input.accessLevel;
    };
    localUsers.add(id, localUser);
    localUserCredentials.add(id, creds);
    id;
  };

  public shared ({ caller }) func updateLocalUser(id : Nat, input : LocalUserInput) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update local users");
    };

    switch (localUsers.get(id)) {
      case (null) { Runtime.trap("Local user not found") };
      case (?existing) {
        let updated : StoreLocalUser = {
          id = existing.id;
          name = input.name;
          employeeCode = input.employeeCode;
          department = input.department;
          email = input.email;
          notes = input.notes;
        };
        let updatedCreds : StoreLocalUserCredentials = {
          username = input.username;
          password = if (input.password == "") {
            switch (localUserCredentials.get(id)) { case (?c) { c.password }; case (null) { "" } }
          } else { input.password };
          accessLevel = input.accessLevel;
        };
        localUsers.add(id, updated);
        localUserCredentials.add(id, updatedCreds);
      };
    };
  };

  public shared func updateLocalUserWithCreds(adminUsername : Text, adminPassword : Text, id : Nat, input : LocalUserInput) : async () {
    if (not isLocalAdminCreds(adminUsername, adminPassword)) {
      Runtime.trap("Unauthorized: Invalid admin credentials");
    };
    switch (localUsers.get(id)) {
      case (null) { Runtime.trap("Local user not found") };
      case (?existing) {
        let updated : StoreLocalUser = {
          id = existing.id;
          name = input.name;
          employeeCode = input.employeeCode;
          department = input.department;
          email = input.email;
          notes = input.notes;
        };
        let updatedCreds : StoreLocalUserCredentials = {
          username = input.username;
          password = if (input.password == "") {
            switch (localUserCredentials.get(id)) { case (?c) { c.password }; case (null) { "" } }
          } else { input.password };
          accessLevel = input.accessLevel;
        };
        localUsers.add(id, updated);
        localUserCredentials.add(id, updatedCreds);
      };
    };
  };

  public shared ({ caller }) func deleteLocalUser(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can delete local users");
    };
    if (not localUsers.containsKey(id)) {
      Runtime.trap("Local user not found");
    };
    localUsers.remove(id);
    localUserCredentials.remove(id);
  };

  public shared func deleteLocalUserWithCreds(adminUsername : Text, adminPassword : Text, id : Nat) : async () {
    if (not isLocalAdminCreds(adminUsername, adminPassword)) {
      Runtime.trap("Unauthorized: Invalid admin credentials");
    };
    if (not localUsers.containsKey(id)) {
      Runtime.trap("Local user not found");
    };
    localUsers.remove(id);
    localUserCredentials.remove(id);
  };

  public query ({ caller }) func getAllLocalUsers() : async [LocalUser] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can fetch local users");
    };
    localUsers.values().map(toLocalUser).toArray();
  };

  // Credential-based variant for local sessions
  public query func getAllLocalUsersWithCreds(adminUsername : Text, adminPassword : Text) : async [LocalUser] {
    if (not isLocalAdminCreds(adminUsername, adminPassword)) {
      Runtime.trap("Unauthorized: Invalid admin credentials");
    };
    localUsers.values().map(toLocalUser).toArray();
  };


  // Login local user by username and password - public, no auth required
  public query func loginLocalUser(username : Text, password : Text) : async ?{ id : Nat; name : Text; accessLevel : Text } {
    var result : ?{ id : Nat; name : Text; accessLevel : Text } = null;
    for ((id, creds) in localUserCredentials.entries()) {
      if (creds.username == username and creds.password == password) {
        switch (localUsers.get(id)) {
          case (?user) {
            result := ?{
              id = user.id;
              name = user.name;
              accessLevel = creds.accessLevel;
            };
          };
          case (null) {};
        };
      };
    };
    result;
  };

  // Bootstrap admin - force assigns caller as admin regardless of existing state
  // This allows recovery when admin session is lost after upgrades
  public shared ({ caller }) func bootstrapAdmin() : async Bool {
    if (caller.isAnonymous()) {
      return false;
    };
    // Always assign caller as admin - allows recovery after upgrades or lost sessions
    // Clear any existing admin roles first to avoid multiple admins
    let toRemove : [Principal.Principal] = accessControlState.userRoles.entries()
      .filter(func((_, role) : (Principal.Principal, AccessControl.UserRole)) : Bool { role == #admin })
      .map(func((p, _) : (Principal.Principal, AccessControl.UserRole)) : Principal.Principal { p })
      .toArray();
    toRemove.forEach(func(p) { accessControlState.userRoles.remove(p) });
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
          processorType = input.processorType;
          ram = input.ram;
          storage = input.storage;
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

  // Software Inventory CRUD

  public shared ({ caller }) func addSoftware(input : StoreSoftwareInput) : async Nat {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can add software");
    };
    addSoftwareInternal(input);
  };

  public shared ({ caller }) func updateSoftware(id : Nat, input : StoreSoftwareInput) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can update software");
    };
    switch (softwareInventory.get(id)) {
      case (null) { Runtime.trap("Software not found") };
      case (?existing) {
        let updated = softwareInputToRecord(?id, input, existing.createdAt);
        softwareInventory.add(id, updated);
        // Update assignedTo separately
        switch (input.assignedTo) {
          case (null) { softwareAssignedTo.remove(id) };
          case (?v) { softwareAssignedTo.add(id, v) };
        };
      };
    };
  };

  public shared ({ caller }) func deleteSoftware(id : Nat) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can delete software");
    };
    softwareInventory.remove(id);
    softwareAssignedTo.remove(id);
  };

  public query ({ caller }) func getAllSoftware() : async [StoreSoftware] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can fetch software");
    };
    softwareInventory.values().map(toSoftware).toArray().sort();
  };

  public query ({ caller }) func getSoftware(id : Nat) : async StoreSoftware {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can fetch software");
    };
    switch (softwareInventory.get(id)) {
      case (null) { Runtime.trap("Software not found") };
      case (?record) { toSoftware(record) };
    };
  };

  public query ({ caller }) func getSoftwareByVendor(vendor : Text) : async [StoreSoftware] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can fetch software");
    };
    softwareInventory.values().toArray().filter(
      func(record) {
        record.vendor.toLower().contains(#text(vendor.toLower()));
      }
    ).map(toSoftware).sort();
  };

  public query ({ caller }) func searchSoftware(term : Text) : async [StoreSoftware] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can fetch software");
    };
    let lowerTerm = term.toLower();
    softwareInventory.values().toArray().filter(
      func(record) {
        record.name.toLower().contains(#text(lowerTerm)) or record.vendor.toLower().contains(#text(lowerTerm));
      }
    ).map(toSoftware).sort();
  };
};
