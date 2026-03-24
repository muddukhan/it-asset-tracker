import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Set "mo:core/Set";
import Principal "mo:core/Principal";

import AccessControl "authorization/access-control";
import Storage "blob-storage/Storage";

module {
  // Type aliases
  type OldStoreUserProfile = {
    name : Text;
  };

  type OldStoreAssignmentHistoryEntry = {
    id : Nat;
    assetId : Nat;
    assetName : Text;
    changedBy : Principal.Principal;
    fromAssignee : ?Text;
    toAssignee : ?Text;
    fromStatus : {
      #available;
      #assigned;
      #inRepair;
      #retired;
      #inStorage;
    };
    toStatus : {
      #available;
      #assigned;
      #inRepair;
      #retired;
      #inStorage;
    };
    timestamp : Time.Time;
  };

  type OldAssetCategory = {
    #laptop;
    #desktop;
    #monitor;
    #server;
    #printer;
    #peripheral;
    #other;
  };

  type OldAssetStatus = {
    #available;
    #assigned;
    #inRepair;
    #retired;
    #inStorage;
  };

  type OldStoreAsset = {
    id : Nat;
    name : Text;
    category : OldAssetCategory;
    serialNumber : Text;
    assignedUser : ?Text;
    location : Text;
    status : OldAssetStatus;
    purchaseDate : ?Text;
    warrantyDate : ?Text;
    notes : ?Text;
    photoId : ?Storage.ExternalBlob;
    createdAt : Time.Time;
  };

  // Minimal types of old actor - don't add code or fields or swap order!
  type OldActor = {
    nextAssetId : Nat;
    nextHistoryId : Nat;
    nextLocalUserId : Nat;
    assets : Map.Map<Nat, OldStoreAsset>;
    history : Map.Map<Nat, OldStoreAssignmentHistoryEntry>;
    assetEmployeeCodes : Map.Map<Nat, Text>;
    localUsers : Map.Map<Nat, {
      id : Nat;
      name : Text;
      employeeCode : Text;
      department : Text;
      email : Text;
      notes : ?Text;
    }>;
    userProfiles : Map.Map<Principal.Principal, OldStoreUserProfile>;
    accessControlState : AccessControl.AccessControlState;
    // Store initialized as stable variable in migration only
    initialized : Set.Set<Nat>;
  };

  // Minimal types of new actor - don't add code or fields or swap order!
  type NewActor = {
    nextAssetId : Nat;
    nextHistoryId : Nat;
    nextLocalUserId : Nat;
    nextSoftwareId : Nat;
    assets : Map.Map<Nat, OldStoreAsset>;
    history : Map.Map<Nat, OldStoreAssignmentHistoryEntry>;
    assetEmployeeCodes : Map.Map<Nat, Text>;
    softwareInventory : Map.Map<Nat, {
      id : Nat;
      name : Text;
      vendor : Text;
      purchaseDate : ?Text;
      licenseExpiry : ?Text;
      licenseKey : ?Text;
      licenseType : ?Text;
      notes : ?Text;
      createdAt : Time.Time;
    }>;
    localUsers : Map.Map<Nat, {
      id : Nat;
      name : Text;
      employeeCode : Text;
      department : Text;
      email : Text;
      notes : ?Text;
    }>;
    userProfiles : Map.Map<Principal.Principal, OldStoreUserProfile>;
    accessControlState : AccessControl.AccessControlState;
    initialized : Set.Set<Nat>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      nextSoftwareId = 1;
      softwareInventory = Map.empty<Nat, {
        id : Nat;
        name : Text;
        vendor : Text;
        purchaseDate : ?Text;
        licenseExpiry : ?Text;
        licenseKey : ?Text;
        licenseType : ?Text;
        notes : ?Text;
        createdAt : Time.Time;
      }>();
    };
  };
};
