import Map "mo:core/Map";
import Time "mo:core/Time";
import List "mo:core/List";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";

module {
  type Category = {
    #laptop;
    #desktop;
    #monitor;
    #server;
    #printer;
    #peripheral;
    #other;
  };

  type Status = {
    #available;
    #assigned;
    #inRepair;
    #retired;
    #inStorage;
  };

  type OldStoreAsset = {
    id : Nat;
    name : Text;
    category : Category;
    serialNumber : Text;
    assignedUser : ?Text;
    location : Text;
    status : Status;
    purchaseDate : ?Text;
    warrantyDate : ?Text;
    notes : ?Text;
    photoId : ?Storage.ExternalBlob;
    createdAt : Time.Time;
  };

  type NewStoreAsset = {
    id : Nat;
    name : Text;
    category : Category;
    serialNumber : Text;
    assignedUser : ?Text;
    location : Text;
    status : Status;
    purchaseDate : ?Text;
    warrantyDate : ?Text;
    notes : ?Text;
    photoId : ?Storage.ExternalBlob;
    createdAt : Time.Time;
    processorType : ?Text;
    ram : ?Text;
    storage : ?Text;
  };

  type AssignmentHistoryEntry = {
    id : Nat;
    assetId : Nat;
    assetName : Text;
    changedBy : Principal.Principal;
    fromAssignee : ?Text;
    toAssignee : ?Text;
    fromStatus : Status;
    toStatus : Status;
    timestamp : Time.Time;
  };

  type LocalUser = {
    id : Nat;
    name : Text;
    employeeCode : Text;
    department : Text;
    email : Text;
    notes : ?Text;
  };

  type Software = {
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

  type OldActor = {
    nextAssetId : Nat;
    nextHistoryId : Nat;
    nextLocalUserId : Nat;
    nextSoftwareId : Nat;
    assets : Map.Map<Nat, OldStoreAsset>;
    history : Map.Map<Nat, AssignmentHistoryEntry>;
    initialized : Set.Set<Nat>;
    userProfiles : Map.Map<Principal.Principal, { name : Text }>;
    localUsers : Map.Map<Nat, LocalUser>;
    assetEmployeeCodes : Map.Map<Nat, Text>;
    softwareInventory : Map.Map<Nat, Software>;
    accessControlState : AccessControl.AccessControlState;
  };

  type NewActor = {
    nextAssetId : Nat;
    nextHistoryId : Nat;
    nextLocalUserId : Nat;
    nextSoftwareId : Nat;
    assets : Map.Map<Nat, NewStoreAsset>;
    history : Map.Map<Nat, AssignmentHistoryEntry>;
    initialized : Set.Set<Nat>;
    userProfiles : Map.Map<Principal.Principal, { name : Text }>;
    localUsers : Map.Map<Nat, LocalUser>;
    assetEmployeeCodes : Map.Map<Nat, Text>;
    softwareInventory : Map.Map<Nat, Software>;
    accessControlState : AccessControl.AccessControlState;
  };

  public func run(old : OldActor) : NewActor {
    func convertOldToNew(old : OldStoreAsset) : NewStoreAsset {
      {
        id = old.id;
        name = old.name;
        category = old.category;
        serialNumber = old.serialNumber;
        assignedUser = old.assignedUser;
        location = old.location;
        status = old.status;
        purchaseDate = old.purchaseDate;
        warrantyDate = old.warrantyDate;
        notes = old.notes;
        photoId = old.photoId;
        createdAt = old.createdAt;
        processorType = null;
        ram = null;
        storage = null;
      };
    };

    let newAssets = old.assets.map<Nat, OldStoreAsset, NewStoreAsset>(
      func(_id, oldAsset) {
        convertOldToNew(oldAsset);
      }
    );

    { old with assets = newAssets };
  };
};
