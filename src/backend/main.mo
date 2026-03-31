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
    assetTag : ?Text;
    vendorName : ?Text;
    invoiceNumber : ?Text;
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
    assetTag : ?Text;
    vendorName : ?Text;
    invoiceNumber : ?Text;
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

  // Software Inventory Input type
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
    assetTag : ?Text;
    invoiceNumber : ?Text;
  };

  // Public Software type returned by API
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
    assetTag : ?Text;
    invoiceNumber : ?Text;
  };

  // Store Types — Do NOT change shape to preserve compatibility with (de)serialization!
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

  // Stable variables — persisted across upgrades
  stable var stableAdminAssigned : Bool = false;
  stable var stableUserRoles : [(Principal.Principal, AccessControl.UserRole)] = [];
  stable var stableNextAssetId : Nat = 1;
  stable var stableNextHistoryId : Nat = 1;
  stable var stableNextLocalUserId : Nat = 1;
  stable var stableNextSoftwareId : Nat = 1;
  stable var stableAssets : [(Nat, StoreAsset)] = [];
  stable var stableHistory : [(Nat, StoreAssignmentHistoryEntry)] = [];
  stable var stableLocalUsers : [(Nat, StoreLocalUser)] = [];
  stable var stableLocalUserCredentials : [(Nat, StoreLocalUserCredentials)] = [];
  stable var stableAssetEmployeeCodes : [(Nat, Text)] = [];
  stable var stableSoftwareInventory : [(Nat, StoreSoftwareRecord)] = [];
  stable var stableSoftwareAssignedTo : [(Nat, Text)] = [];
  stable var stableAssetTags : [(Nat, Text)] = [];
  stable var stableAssetVendorNames : [(Nat, Text)] = [];
  stable var stableAssetInvoiceNumbers : [(Nat, Text)] = [];
  stable var stableSoftwareAssetTags : [(Nat, Text)] = [];
  stable var stableSoftwareInvoiceNumbers : [(Nat, Text)] = [];
  stable var stableDataSaved : Bool = false;

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
  let softwareInventory = Map.empty<Nat, StoreSoftwareRecord>();
  let softwareAssignedTo = Map.empty<Nat, Text>();
  // New separate maps for new fields (preserves stable storage compatibility)
  let assetTags = Map.empty<Nat, Text>();
  let assetVendorNames = Map.empty<Nat, Text>();
  let assetInvoiceNumbers = Map.empty<Nat, Text>();
  let softwareAssetTags = Map.empty<Nat, Text>();
  let softwareInvoiceNumbers = Map.empty<Nat, Text>();

  // Helper: merge StoreAsset with all separate maps into the public Asset type
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
      assetTag = assetTags.get(s.id);
      vendorName = assetVendorNames.get(s.id);
      invoiceNumber = assetInvoiceNumbers.get(s.id);
    };
  };

  // Helper: merge StoreSoftwareRecord with all separate maps into public StoreSoftware type
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
      assetTag = softwareAssetTags.get(s.id);
      invoiceNumber = softwareInvoiceNumbers.get(s.id);
    };
  };

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

  system func preupgrade() {
    // Save all state to stable variables
    stableAdminAssigned := accessControlState.adminAssigned;
    stableUserRoles := accessControlState.userRoles.entries().toArray();
    stableNextAssetId := nextAssetId;
    stableNextHistoryId := nextHistoryId;
    stableNextLocalUserId := nextLocalUserId;
    stableNextSoftwareId := nextSoftwareId;
    stableAssets := assets.entries().toArray();
    stableHistory := history.entries().toArray();
    stableLocalUsers := localUsers.entries().toArray();
    stableLocalUserCredentials := localUserCredentials.entries().toArray();
    stableAssetEmployeeCodes := assetEmployeeCodes.entries().toArray();
    stableSoftwareInventory := softwareInventory.entries().toArray();
    stableSoftwareAssignedTo := softwareAssignedTo.entries().toArray();
    stableAssetTags := assetTags.entries().toArray();
    stableAssetVendorNames := assetVendorNames.entries().toArray();
    stableAssetInvoiceNumbers := assetInvoiceNumbers.entries().toArray();
    stableSoftwareAssetTags := softwareAssetTags.entries().toArray();
    stableSoftwareInvoiceNumbers := softwareInvoiceNumbers.entries().toArray();
    stableDataSaved := not initialized.isEmpty();
  };

  system func postupgrade() {
    // Restore admin state
    accessControlState.adminAssigned := stableAdminAssigned;
    for ((p, r) in stableUserRoles.vals()) {
      accessControlState.userRoles.add(p, r);
    };
    stableUserRoles := [];

    // Restore counters
    if (stableNextAssetId > 1) { nextAssetId := stableNextAssetId };
    if (stableNextHistoryId > 1) { nextHistoryId := stableNextHistoryId };
    if (stableNextLocalUserId > 1) { nextLocalUserId := stableNextLocalUserId };
    if (stableNextSoftwareId > 1) { nextSoftwareId := stableNextSoftwareId };

    // Restore assets and related maps
    for ((k, v) in stableAssets.vals()) { assets.add(k, v) };
    stableAssets := [];
    for ((k, v) in stableHistory.vals()) { history.add(k, v) };
    stableHistory := [];
    for ((k, v) in stableLocalUsers.vals()) { localUsers.add(k, v) };
    stableLocalUsers := [];
    for ((k, v) in stableLocalUserCredentials.vals()) { localUserCredentials.add(k, v) };
    stableLocalUserCredentials := [];
    for ((k, v) in stableAssetEmployeeCodes.vals()) { assetEmployeeCodes.add(k, v) };
    stableAssetEmployeeCodes := [];
    for ((k, v) in stableSoftwareInventory.vals()) { softwareInventory.add(k, v) };
    stableSoftwareInventory := [];
    for ((k, v) in stableSoftwareAssignedTo.vals()) { softwareAssignedTo.add(k, v) };
    stableSoftwareAssignedTo := [];
    for ((k, v) in stableAssetTags.vals()) { assetTags.add(k, v) };
    stableAssetTags := [];
    for ((k, v) in stableAssetVendorNames.vals()) { assetVendorNames.add(k, v) };
    stableAssetVendorNames := [];
    for ((k, v) in stableAssetInvoiceNumbers.vals()) { assetInvoiceNumbers.add(k, v) };
    stableAssetInvoiceNumbers := [];
    for ((k, v) in stableSoftwareAssetTags.vals()) { softwareAssetTags.add(k, v) };
    stableSoftwareAssetTags := [];
    for ((k, v) in stableSoftwareInvoiceNumbers.vals()) { softwareInvoiceNumbers.add(k, v) };
    stableSoftwareInvoiceNumbers := [];

    // Only seed sample data on first-ever run (not on upgrades)
    if (not stableDataSaved and initialized.isEmpty()) {
      addSampleAssets();
      addSampleSoftware();
      initialized.add(0);
    } else if (stableDataSaved) {
      initialized.add(0); // mark as initialized to prevent future seeding
    };
    stableDataSaved := false;
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
        assetTag = null;
        invoiceNumber = null;
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
        assetTag = null;
        invoiceNumber = null;
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
        assetTag = null;
        invoiceNumber = null;
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
        assetTag = null;
        vendorName = null;
        invoiceNumber = null;
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
        assetTag = null;
        vendorName = null;
        invoiceNumber = null;
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
        assetTag = null;
        vendorName = null;
        invoiceNumber = null;
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
        assetTag = null;
        vendorName = null;
        invoiceNumber = null;
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
        assetTag = null;
        vendorName = null;
        invoiceNumber = null;
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
        assetTag = null;
        vendorName = null;
        invoiceNumber = null;
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
        assetTag = null;
        vendorName = null;
        invoiceNumber = null;
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
        assetTag = null;
        vendorName = null;
        invoiceNumber = null;
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

    switch (input.employeeCode) {
      case (null) { assetEmployeeCodes.remove(id) };
      case (?code) { assetEmployeeCodes.add(id, code) };
    };
    switch (input.assetTag) {
      case (null) { assetTags.remove(id) };
      case (?v) { assetTags.add(id, v) };
    };
    switch (input.vendorName) {
      case (null) { assetVendorNames.remove(id) };
      case (?v) { assetVendorNames.add(id, v) };
    };
    switch (input.invoiceNumber) {
      case (null) { assetInvoiceNumbers.remove(id) };
      case (?v) { assetInvoiceNumbers.add(id, v) };
    };

    id;
  };

  // Internal Add Software
  func addSoftwareInternal(input : StoreSoftwareInput) : Nat {
    let id = nextSoftwareId;
    nextSoftwareId += 1;
    let record : StoreSoftwareRecord = softwareInputToRecord(input.id, input, Time.now());
    softwareInventory.add(id, record);
    switch (input.assignedTo) {
      case (null) { softwareAssignedTo.remove(id) };
      case (?v) { softwareAssignedTo.add(id, v) };
    };
    switch (input.assetTag) {
      case (null) { softwareAssetTags.remove(id) };
      case (?v) { softwareAssetTags.add(id, v) };
    };
    switch (input.invoiceNumber) {
      case (null) { softwareInvoiceNumbers.remove(id) };
      case (?v) { softwareInvoiceNumbers.add(id, v) };
    };
    id;
  };

  func isLocalAdminCreds(username : Text, password : Text) : Bool {
    if (username == "" or password == "") return false;
    for ((id, creds) in localUserCredentials.entries()) {
      if (creds.username == username and creds.password == password and creds.accessLevel == "admin") {
        return true;
      };
    };
    false;
  };

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
            switch (localUserCredentials.get(id)) { case (?c) { c.password }; case (null) { "" } };
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

  public query ({ caller }) func getAllLocalUsers() : async [LocalUser] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can fetch local users");
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


  // Create first local user — only works when no local users exist (first-time setup)
  public func createFirstLocalUser(input : LocalUserInput) : async { #ok : Nat; #err : Text } {
    if (localUsers.size() > 0) {
      return #err("Setup already complete. Please log in.");
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
      accessLevel = "admin";
    };
    localUsers.add(id, localUser);
    localUserCredentials.add(id, creds);
    #ok(id);
  };

  // Check if any local users exist (used by login page to show setup vs login)
  public query func hasLocalUsers() : async Bool {
    localUsers.size() > 0;
  };

  public shared ({ caller }) func bootstrapAdmin() : async Bool {
    if (caller.isAnonymous()) {
      return false;
    };
    let toRemove : [Principal.Principal] = accessControlState.userRoles.entries()
      .filter(func((_, role) : (Principal.Principal, AccessControl.UserRole)) : Bool { role == #admin })
      .map(func((p, _) : (Principal.Principal, AccessControl.UserRole)) : Principal.Principal { p })
      .toArray();
    toRemove.forEach(func(p) { accessControlState.userRoles.remove(p) });
    accessControlState.userRoles.add(caller, #admin);
    accessControlState.adminAssigned := true;
    true;
  };

  public query ({ caller }) func getAllUsersWithRoles() : async [UserWithRole] {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
      Runtime.trap("Unauthorized: Only admins can view user roles");
    };
    accessControlState.userRoles.entries().map(
      func((p, r)) : UserWithRole { { principal = p; role = r } }
    ).toArray();
  };

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

        switch (input.employeeCode) {
          case (null) { assetEmployeeCodes.remove(id) };
          case (?code) { assetEmployeeCodes.add(id, code) };
        };
        switch (input.assetTag) {
          case (null) { assetTags.remove(id) };
          case (?v) { assetTags.add(id, v) };
        };
        switch (input.vendorName) {
          case (null) { assetVendorNames.remove(id) };
          case (?v) { assetVendorNames.add(id, v) };
        };
        switch (input.invoiceNumber) {
          case (null) { assetInvoiceNumbers.remove(id) };
          case (?v) { assetInvoiceNumbers.add(id, v) };
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
    assetTags.remove(id);
    assetVendorNames.remove(id);
    assetInvoiceNumbers.remove(id);
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

  public query ({ caller }) func getStats() : async Stats {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    let allAssets = assets.values().toArray();
    let total = allAssets.size();
    let assigned = allAssets.filter(func(asset) { asset.status == #assigned }).size();
    let inRepair = allAssets.filter(func(asset) { asset.status == #inRepair }).size();
    let available = allAssets.filter(func(asset) { asset.status == #available }).size();
    { total; assigned; inRepair; available };
  };

  public query ({ caller }) func getWarrantyStats() : async WarrantyStats {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can perform this action");
    };
    let allAssets = assets.values().toArray();
    let total = allAssets.filter(func(asset) { asset.warrantyDate != null }).size();
    { total; expiringSoon = 0; expired = 0; active = total };
  };

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
        switch (input.assignedTo) {
          case (null) { softwareAssignedTo.remove(id) };
          case (?v) { softwareAssignedTo.add(id, v) };
        };
        switch (input.assetTag) {
          case (null) { softwareAssetTags.remove(id) };
          case (?v) { softwareAssetTags.add(id, v) };
        };
        switch (input.invoiceNumber) {
          case (null) { softwareInvoiceNumbers.remove(id) };
          case (?v) { softwareInvoiceNumbers.add(id, v) };
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
    softwareAssetTags.remove(id);
    softwareInvoiceNumbers.remove(id);
  };

  public query ({ caller }) func getAllSoftware() : async [StoreSoftware] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view software");
    };
    softwareInventory.values().map(toSoftware).toArray().sort();
  };

  public shared ({ caller }) func assignRole(user : Principal.Principal, role : AccessControl.UserRole) : async () {
    if (not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Only admins can assign roles");
    };
    accessControlState.userRoles.add(user, role);
  };


// ── Credential-based write operations for local admin users ──────────────────

  public shared ({ caller }) func addAssetWithCreds(adminUsername : Text, adminPassword : Text, input : AssetInput) : async Nat {
    if (not isAdminCallerOrCreds(caller, adminUsername, adminPassword)) {
      Runtime.trap("Unauthorized: Only admins can add assets");
    };
    addAssetInternal(input);
  };

  public shared ({ caller }) func updateAssetWithCreds(adminUsername : Text, adminPassword : Text, id : Nat, input : AssetInput) : async () {
    if (not isAdminCallerOrCreds(caller, adminUsername, adminPassword)) {
      Runtime.trap("Unauthorized: Only admins can update assets");
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
        switch (input.employeeCode) {
          case (null) { assetEmployeeCodes.remove(id) };
          case (?code) { assetEmployeeCodes.add(id, code) };
        };
        switch (input.assetTag) {
          case (null) { assetTags.remove(id) };
          case (?v) { assetTags.add(id, v) };
        };
        switch (input.vendorName) {
          case (null) { assetVendorNames.remove(id) };
          case (?v) { assetVendorNames.add(id, v) };
        };
        switch (input.invoiceNumber) {
          case (null) { assetInvoiceNumbers.remove(id) };
          case (?v) { assetInvoiceNumbers.add(id, v) };
        };
        addToHistory(id, caller, existing.status, input);
        assets.add(id, updated);
      };
    };
  };

  public shared ({ caller }) func deleteAssetWithCreds(adminUsername : Text, adminPassword : Text, id : Nat) : async () {
    if (not isAdminCallerOrCreds(caller, adminUsername, adminPassword)) {
      Runtime.trap("Unauthorized: Only admins can delete assets");
    };
    assets.remove(id);
    assetEmployeeCodes.remove(id);
    assetTags.remove(id);
    assetVendorNames.remove(id);
    assetInvoiceNumbers.remove(id);
  };

  public shared ({ caller }) func addSoftwareWithCreds(adminUsername : Text, adminPassword : Text, input : StoreSoftwareInput) : async Nat {
    if (not isAdminCallerOrCreds(caller, adminUsername, adminPassword)) {
      Runtime.trap("Unauthorized: Only admins can add software");
    };
    addSoftwareInternal(input);
  };

  public shared ({ caller }) func updateSoftwareWithCreds(adminUsername : Text, adminPassword : Text, id : Nat, input : StoreSoftwareInput) : async () {
    if (not isAdminCallerOrCreds(caller, adminUsername, adminPassword)) {
      Runtime.trap("Unauthorized: Only admins can update software");
    };
    switch (softwareInventory.get(id)) {
      case (null) { Runtime.trap("Software not found") };
      case (?existing) {
        let updated = softwareInputToRecord(?id, input, existing.createdAt);
        softwareInventory.add(id, updated);
        switch (input.assignedTo) {
          case (null) { softwareAssignedTo.remove(id) };
          case (?v) { softwareAssignedTo.add(id, v) };
        };
        switch (input.assetTag) {
          case (null) { softwareAssetTags.remove(id) };
          case (?v) { softwareAssetTags.add(id, v) };
        };
        switch (input.invoiceNumber) {
          case (null) { softwareInvoiceNumbers.remove(id) };
          case (?v) { softwareInvoiceNumbers.add(id, v) };
        };
      };
    };
  };

  public shared ({ caller }) func deleteSoftwareWithCreds(adminUsername : Text, adminPassword : Text, id : Nat) : async () {
    if (not isAdminCallerOrCreds(caller, adminUsername, adminPassword)) {
      Runtime.trap("Unauthorized: Only admins can delete software");
    };
    softwareInventory.remove(id);
    softwareAssignedTo.remove(id);
    softwareAssetTags.remove(id);
    softwareInvoiceNumbers.remove(id);
  };

  public shared ({ caller }) func addLocalUserWithCreds(adminUsername : Text, adminPassword : Text, input : LocalUserInput) : async Nat {
    if (not isAdminCallerOrCreds(caller, adminUsername, adminPassword)) {
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

  public shared ({ caller }) func updateLocalUserWithCreds(adminUsername : Text, adminPassword : Text, id : Nat, input : LocalUserInput) : async () {
    if (not isAdminCallerOrCreds(caller, adminUsername, adminPassword)) {
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
            switch (localUserCredentials.get(id)) { case (?c) { c.password }; case (null) { "" } };
          } else { input.password };
          accessLevel = input.accessLevel;
        };
        localUsers.add(id, updated);
        localUserCredentials.add(id, updatedCreds);
      };
    };
  };

  public shared ({ caller }) func deleteLocalUserWithCreds(adminUsername : Text, adminPassword : Text, id : Nat) : async () {
    if (not isAdminCallerOrCreds(caller, adminUsername, adminPassword)) {
      Runtime.trap("Unauthorized: Only admins can delete local users");
    };
    if (not localUsers.containsKey(id)) {
      Runtime.trap("Local user not found");
    };
    localUsers.remove(id);
    localUserCredentials.remove(id);
  };

  public query func isAdminWithCreds(adminUsername : Text, adminPassword : Text) : async Bool {
    isLocalAdminCreds(adminUsername, adminPassword);
  };

  // Allows a user from users.json to self-register into the backend credential store.
  // Safe: if username already exists with matching password, it is a no-op.
  // If username exists with different password, it is rejected.
  public shared func selfRegisterLocalUser(username : Text, password : Text, name : Text, accessLevel : Text) : async Bool {
    if (username == "" or password == "") return false;
    // Check if already registered
    for ((id, creds) in localUserCredentials.entries()) {
      if (creds.username == username) {
        // Already exists — only allow if password matches (idempotent)
        if (creds.password == password) return true;
        return false; // username taken with different password
      };
    };
    // Register new user
    let id = nextLocalUserId;
    nextLocalUserId += 1;
    let localUser : StoreLocalUser = {
      id;
      name;
      employeeCode = "";
      department = "";
      email = "";
      notes = null;
    };
    let creds : StoreLocalUserCredentials = {
      username;
      password;
      accessLevel;
    };
    localUsers.add(id, localUser);
    localUserCredentials.add(id, creds);
    true;
  };

}
