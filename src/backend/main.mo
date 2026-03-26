import List "mo:core/List";
import Order "mo:core/Order";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Array "mo:core/Array";

actor {
  type SensorReading = {
    timestamp : Int;
    temperature : Float;
    pH : Float;
    glucose : Float;
  };

  module SensorReading {
    public func compare(reading1 : SensorReading, reading2 : SensorReading) : Order.Order {
      Int.compare(reading1.timestamp, reading2.timestamp);
    };
  };

  let readings = List.empty<SensorReading>();

  public shared ({ caller }) func addReading(reading : SensorReading) : async () {
    readings.add(reading);
  };

  public query ({ caller }) func getAllReadings() : async [SensorReading] {
    readings.toArray().sort();
  };
};
