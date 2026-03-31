import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";
import { Principal } from "@dfinity/principal";
import Button from "./Button";
import { opend } from "../../../declarations/opend";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";

function Item(props) {

  const [name, setName] = useState("");
  const [owner, setOwner] = useState();
  const [image, setImage]= useState();
  const [button, setButton]= useState();
  const [priceInput, setPrice]= useState();
  const [loaderHidden, setLoader] = useState(true);
  const [blur, setBlur] = useState();
  const [status, setStatus] = useState("");
  const [priceLabel, setLabel] = useState();
  const [shouldDisplay, setDisplay] = useState(true);

  const id= props.id;
  const nftId =
  typeof props.id === "string"
    ? Principal.fromText(props.id)
    : props.id;


  const localHost="http://localhost:8080/";
  const agent= new HttpAgent({
    host: localHost
  });

  agent.fetchRootKey(); // remove this line while deploying it live
  let NFTActor;
  async function loadNFT(){
    NFTActor= await Actor.createActor(idlFactory,{
      agent,
      canisterId: id,
    });

    const name = await NFTActor.getName();
    const owner = await NFTActor.getOwner();
    const imageData = await NFTActor.getAsset();
    const imageContent= new Uint8Array(imageData);
    const image= URL.createObjectURL(
      new Blob([imageContent.buffer], {type:"image/png"})
    );
    setName(name); 
    setOwner(owner.toText());
    setImage(image);

    if(props.role=="collection"){
      const nftIsListed = await opend.isListed(nftId);
      if(nftIsListed == true){
        setStatus("Listed");
        setOwner("OpenD");
        setBlur({filter: "blur(4px)"});
      }
      else{
        setButton(<Button handleClick={handleSell} text={"Sell"}/>);
      }
    }
    else if(props.role=="discover"){
      const originalOwner = await opend.getOriginalOwner(props.id);
      if(originalOwner.toText() != CURRENT_USER_ID.toText()){
        setButton(<Button handleClick={handleBuy} text={"Buy"}/>);
      }

      const nftprice= await opend.getListedNFTPrice(props.id);
      setLabel(<PriceLabel sellPrice={nftprice.toString()}/>);
      
    }
    
    
  }

  useEffect( () => {
    loadNFT();
  }, []);

  let price;
  function handleSell(){
    console.log("clicked");
    setPrice(
      <input
        placeholder="Price in MEOW"
        type="number"
        className="price-input"
        value={price}
        onChange={(e)=> (price=e.target.value)}
      />
    );

    setButton(<Button handleClick={sellItem} text={"Confirm"}/>);
  }

  async function handleBuy(){
    console.log("buy clicked");

    setLoader(false);

    const tokenActor= await Actor.createActor(tokenIdlFactory, {
      agent,
      canisterId: Principal.fromText("tlwi3-3aaaa-aaaaa-aaapq-cai"),
    });
    const sellerId= await opend.getOriginalOwner(props.id);
    const itemPrice= await opend.getListedNFTPrice(props.id);
    const result = await tokenActor.transfer(sellerId, itemPrice);
    console.log(result);
    if(result == "Success"){
      const transferResult= await opend.completePurchase(props.id, sellerId, CURRENT_USER_ID);
      console.log("purchase "+transferResult);
      setLoader(true);
      setDisplay(false);
    }
  }

  async function sellItem() {
    setBlur({filter: "blur(4px)"});
    setLoader(false);

    console.log("sell price "+ price);

    const listingResult = await opend.listItem(nftId, Number(price));
    console.log("listing: "+listingResult);

    if(listingResult == "Success"){
      const opendId = await opend.getOpenDCanisterId();
      const transferResult = await NFTActor.transferOwnership(opendId);
      console.log("transfer: "+transferResult);
      if(transferResult == "Success"){
        setStatus("Listed");
        setLoader(true);
        setButton();
        setPrice();
        setOwner("OpenD");
      }
    }
  }

  return (
    <div style= {{display: shouldDisplay ? "inline" : "none" }} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
        <div className="lds-ellipsis" hidden={loaderHidden}>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text"> {status}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
