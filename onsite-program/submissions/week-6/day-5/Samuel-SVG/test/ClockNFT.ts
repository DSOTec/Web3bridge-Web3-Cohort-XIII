import { expect } from "chai";
import { ethers } from "hardhat";

describe("ClockNFT", function () {
    it("Should mint and return dynamic tokenURI", async function () {
        const [owner] = await ethers.getSigners();
        const ClockNFT = await ethers.getContractFactory("ClockNFT");
        const clock = await ClockNFT.deploy();
        
        // Mint a token
        await clock.mint();

        // Get the token URI
        const tokenId = 0;
        const uri = await clock.tokenURI(tokenId);
        
        // Check that the URI is properly formatted
        expect(uri).to.include("data:application/json;base64,");
        
        // Decode the base64 JSON
        const jsonBase64 = uri.split(",")[1];
        const json = JSON.parse(Buffer.from(jsonBase64, 'base64').toString());
        
        // Check the JSON structure
        expect(json).to.have.property('name');
        expect(json).to.have.property('description');
        expect(json).to.have.property('image');
        
        // Check the image is an SVG
        expect(json.image).to.include("data:image/svg+xml;base64,");
    });
});
